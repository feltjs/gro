import {resolve, extname, join} from 'path';
import lexer from 'es-module-lexer';

import {
	FilerDir,
	FilerDirChangeCallback,
	createFilerDir,
	ExternalsFilerDir,
} from '../build/FilerDir.js';
import {findFiles, remove, outputFile, pathExists, readJson} from '../fs/nodeFs.js';
import {
	basePathToSourceId,
	EXTERNALS_BUILD_DIR,
	hasSourceExtension,
	isThisProjectGro,
	JSON_EXTENSION,
	JS_EXTENSION,
	paths,
	toBuildBasePath,
	toBuildOutPath,
	toSourceExtension,
} from '../paths.js';
import {omitUndefined} from '../utils/object.js';
import {UnreachableError} from '../utils/error.js';
import {Logger, SystemLogger} from '../utils/log.js';
import {magenta, red} from '../colors/terminal.js';
import {printError, printPath} from '../utils/print.js';
import type {Compiler} from '../compile/compiler.js';
import {Encoding, inferEncoding} from '../fs/encoding.js';
import {BuildConfig} from '../config/buildConfig.js';
import {stripEnd, stripStart} from '../utils/string.js';
import {EcmaScriptTarget, DEFAULT_ECMA_SCRIPT_TARGET} from '../compile/tsHelpers.js';
import {ServedDir, ServedDirPartial, toServedDirs} from './ServedDir.js';
import {BuildableSourceFile, createSourceFile, SourceFile} from './sourceFile.js';
import {BuildFile, createBuildFile, diffDependencies} from './buildFile.js';
import {BaseFilerFile, getFileContentsHash} from './baseFilerFile.js';
import {loadContents} from './load.js';
// import './includeme.js';

export type FilerFile = SourceFile | BuildFile; // TODO or Directory? source/compiled directory?

export interface CachedSourceInfo {
	sourceId: string;
	contentsHash: string;
	compilations: {
		id: string;
		buildConfigName: string;
		localDependencies: string[] | null;
		externalDependencies: string[] | null;
		encoding: Encoding;
	}[];
}
const CACHED_SOURCE_INFO_DIR = 'cachedSourceInfo';

export interface Options {
	dev: boolean;
	compiler: Compiler | null;
	compiledDirs: string[];
	externalsDir: string | null;
	servedDirs: ServedDir[];
	buildConfigs: BuildConfig[] | null;
	externalsBuildConfig: BuildConfig | null;
	buildRootDir: string;
	mapBuildIdToSourceId: typeof defaultMapBuildIdToSourceId;
	sourceMap: boolean;
	target: EcmaScriptTarget;
	watch: boolean;
	watcherDebounce: number | undefined;
	cleanOutputDirs: boolean;
	log: Logger;
}
export type InitialOptions = OmitStrict<Partial<Options>, 'servedDirs'> & {
	servedDirs?: ServedDirPartial[];
};
export const initOptions = (opts: InitialOptions): Options => {
	const dev = opts.dev ?? true;
	const buildConfigs = opts.buildConfigs || null;
	if (buildConfigs?.length === 0) {
		throw Error(
			'Filer created with an empty array of buildConfigs.' +
				' Omit the value or provide `null` if this was intended.',
		);
	}
	const externalsBuildConfig =
		opts.externalsBuildConfig || buildConfigs === null
			? null
			: buildConfigs.find((c) => c.primary && c.platform === 'browser') ||
			  buildConfigs.find((c) => c.primary && c.platform === 'node') ||
			  buildConfigs.find((c) => c.primary) ||
			  buildConfigs[0];
	const buildRootDir = opts.buildRootDir || paths.build; // TODO assumes trailing slash
	const compiledDirs = opts.compiledDirs ? opts.compiledDirs.map((d) => resolve(d)) : [];
	const externalsDir =
		externalsBuildConfig === null || opts.externalsDir === null
			? null
			: opts.externalsDir === undefined
			? `${buildRootDir}${EXTERNALS_BUILD_DIR}`
			: resolve(opts.externalsDir);
	validateDirs(compiledDirs, externalsDir, buildRootDir);
	const compiledDirCount = compiledDirs.length + (externalsDir === null ? 0 : 1);
	// default to serving all of the compiled output files
	const servedDirs = toServedDirs(
		opts.servedDirs ||
			(buildConfigs === null
				? []
				: [
						toBuildOutPath(
							dev,
							(buildConfigs.find((c) => c.platform === 'browser') || buildConfigs[0]).name,
							'',
							buildRootDir,
						) + (isThisProjectGro ? '/frontend' : ''), // TODO hacky, remove when `gro.config.ts` is added
				  ]),
		externalsDir,
		buildRootDir,
	);
	if (compiledDirCount === 0 && servedDirs.length === 0) {
		throw Error('Filer created with no directories to compile or serve.');
	}
	if (compiledDirCount !== 0 && buildConfigs === null) {
		throw Error('Filer created with directories to compile but no build configs were provided.');
	}
	const compiler = opts.compiler || null;
	if (compiledDirCount !== 0 && !compiler) {
		throw Error('Filer created with directories to compile but no compiler was provided.');
	}
	if (compiler && compiledDirCount === 0) {
		throw Error('Filer created with a compiler but no directories to compile.');
	}
	return {
		dev,
		mapBuildIdToSourceId: defaultMapBuildIdToSourceId,
		sourceMap: true,
		target: DEFAULT_ECMA_SCRIPT_TARGET,
		watch: true,
		watcherDebounce: undefined,
		cleanOutputDirs: true,
		...omitUndefined(opts),
		log: opts.log || new SystemLogger([magenta('[filer]')]),
		compiler,
		compiledDirs,
		externalsDir,
		servedDirs,
		buildConfigs,
		externalsBuildConfig,
		buildRootDir,
	};
};

export class Filer {
	private readonly files: Map<string, FilerFile> = new Map();
	private readonly dirs: FilerDir[];
	private readonly cachedSourceInfo: Map<string, CachedSourceInfo> = new Map();
	private readonly externalsDir: ExternalsFilerDir | null;
	private readonly externalsServedDir: ServedDir | null;
	private readonly buildConfigs: BuildConfig[] | null;
	// private readonly externalsBuildConfig: BuildConfig | null;
	private readonly mapBuildIdToSourceId: typeof defaultMapBuildIdToSourceId;
	private readonly cleanOutputDirs: boolean;
	private readonly log: Logger;

	// public properties available to e.g. compilers and postprocessors
	readonly buildRootDir: string;
	readonly dev: boolean;
	readonly sourceMap: boolean;
	readonly target: EcmaScriptTarget;
	readonly externalsDirBasePath: string | null;
	readonly servedDirs: readonly ServedDir[];

	constructor(opts: InitialOptions) {
		const {
			dev,
			compiler,
			buildConfigs,
			// externalsBuildConfig,
			buildRootDir,
			mapBuildIdToSourceId,
			compiledDirs,
			servedDirs,
			externalsDir,
			sourceMap,
			target,
			watch,
			watcherDebounce,
			cleanOutputDirs,
			log,
		} = initOptions(opts);
		this.dev = dev;
		this.buildConfigs = buildConfigs;
		// this.externalsBuildConfig = externalsBuildConfig;
		this.buildRootDir = buildRootDir;
		this.mapBuildIdToSourceId = mapBuildIdToSourceId;
		this.sourceMap = sourceMap;
		this.target = target;
		this.cleanOutputDirs = cleanOutputDirs;
		this.log = log;
		this.dirs = createFilerDirs(
			compiledDirs,
			servedDirs,
			externalsDir,
			compiler,
			buildRootDir,
			this.onDirChange,
			watch,
			watcherDebounce,
		);
		this.servedDirs = servedDirs;
		this.externalsDir =
			externalsDir === null
				? null
				: (this.dirs.find((d) => d.dir === externalsDir) as ExternalsFilerDir);
		this.externalsServedDir = servedDirs.find((d) => d.dir === externalsDir) || null;
		this.externalsDirBasePath =
			this.externalsDir === null || this.externalsServedDir === null
				? null
				: stripStart(this.externalsDir.dir, `${this.externalsServedDir.servedAt}/`);
	}

	// Searches for a file matching `path`, limited to the directories that are served.
	async findByPath(path: string): Promise<BaseFilerFile | null> {
		const {externalsDirBasePath, externalsServedDir, files} = this;
		// TODO we need to install externals and load this correctly - how? do we need a special path?
		if (externalsDirBasePath !== null && path.startsWith(externalsDirBasePath)) {
			throw Error('TODO find external');
			// const id = `${externalsServedDir!.servedAt}/${path}`;
			// const file = files.get(id);
			// if (file !== undefined) {
			// 	return file;
			// }
			// const sourceId = stripEnd(stripStart(path, `${externalsDirBasePath}/`), JS_EXTENSION);
			// const shouldCompile = await this.updateSourceFile(sourceId, this.externalsDir!);
			// if (shouldCompile) {
			// 	await this.buildSourceFile(sourceId, this.externalsDir!);
			// }
			// const compiledFile = files.get(id);
			// if (compiledFile === undefined) {
			// 	throw Error('Expected to compile file');
			// }
			// return compiledFile;
		} else {
			for (const servedDir of this.servedDirs) {
				if (servedDir === externalsServedDir) continue;
				const id = `${servedDir.servedAt}/${path}`;
				const file = files.get(id);
				if (file !== undefined) {
					return file;
				}
			}
		}
		return null;
	}

	close(): void {
		for (const dir of this.dirs) {
			dir.close();
		}
	}

	private initializing: Promise<void> | null = null;

	async init(): Promise<void> {
		if (this.initializing) return this.initializing;
		let finishInitializing: () => void;
		this.initializing = new Promise((r) => (finishInitializing = r));

		await Promise.all([this.initCachedSourceInfo(), lexer.init]);
		// Initializing the dirs must be done after `this.initCachedSourceInfo`
		// because it creates source files, which need `this.cachedSourceInfo` to be populated.
		await Promise.all(this.dirs.map((dir) => dir.init()));
		// This performs initial source file compilation, traces deps,
		// and populates the `buildConfigs` property of all source files.
		await this.initBuilds();
		// this.log.info('buildConfigs', this.buildConfigs);

		// TODO this needs to perform matching for each buildConfig against the file,
		// right now it just checks if the file exists at all, not specifically for that buildConfig
		if ((globalThis as any).THIS_IS_TEMPORARILY_DISABLED_SEE_ABOVE) {
			const {buildConfigs} = this;
			if (this.cleanOutputDirs && buildConfigs !== null) {
				// Clean the dev output directories,
				// removing any files that can't be mapped back to source files.
				const buildOutDirs: string[] = buildConfigs.map((buildConfig) =>
					toBuildOutPath(this.dev, buildConfig.name, '', this.buildRootDir),
				);
				await Promise.all(
					buildOutDirs.map(async (outputDir) => {
						if (!(await pathExists(outputDir))) return;
						const files = await findFiles(outputDir, undefined, null);
						await Promise.all(
							Array.from(files.entries()).map(([path, stats]) => {
								if (stats.isDirectory()) return;
								const id = join(outputDir, path);
								if (this.files.has(id)) return;
								if (hasSourceExtension(id)) {
									// TODO do we want this check? maybe perform it synchronously before any `remove` calls?
									throw Error(
										'File in output directory has unexpected source extension.' +
											' Output directories are expected to be fully owned by Gro and should not have source files.' +
											` File is ${id} in outputDir ${outputDir}`,
									);
								}
								this.log.trace('deleting unknown compiled file', printPath(id));
								return remove(id);
							}),
						);
					}),
				);
			}
		}

		// Ensure that the externals directory does not conflict with another served directory.
		// This check must wait until the above syncing completes.
		// TODO we need to delete unknown dirs in the build directory above, not just files,
		// otherwise this error does not get cleared if you delete the conflicting directory
		if (this.externalsServedDir !== null && this.externalsDirBasePath !== null) {
			await checkForConflictingExternalsDir(
				this.servedDirs,
				this.externalsServedDir,
				this.externalsDirBasePath,
			);
		}

		finishInitializing!();
	}

	private async initCachedSourceInfo(): Promise<void> {
		const cachedSourceInfoDir = `${this.buildRootDir}${CACHED_SOURCE_INFO_DIR}`;
		if (!(await pathExists(cachedSourceInfoDir))) return;
		const files = await findFiles(cachedSourceInfoDir, undefined, null);
		await Promise.all(
			Array.from(files.entries()).map(async ([path, stats]) => {
				if (stats.isDirectory()) return;
				const info: CachedSourceInfo = await readJson(`${cachedSourceInfoDir}/${path}`);
				this.cachedSourceInfo.set(info.sourceId, info);
			}),
		);
	}

	// During initialization, after all files are loaded into memory,
	// this is called to populate the `buildConfigs` property of all source files.
	// It traces the dependencies starting from each `buildConfig.input`,
	// compiling each input source file and populating its `buildConfigs`,
	// recursively until all dependencies have been handled.
	private async initBuilds(): Promise<void> {
		if (this.buildConfigs === null) return;

		const promises: Promise<void>[] = [];

		const filters: ((id: string) => boolean)[] = [];
		const filterBuildConfigs: BuildConfig[] = [];

		// Iterate through the build config inputs and initialize their files.
		for (const buildConfig of this.buildConfigs) {
			for (const input of buildConfig.input) {
				if (typeof input === 'function') {
					filters.push(input);
					filterBuildConfigs.push(buildConfig);
					continue;
				}
				const file = this.files.get(input);
				if (!file) {
					throw Error(`Build config '${buildConfig.name}' has unknown input '${input}'`);
				}
				if (file.type !== 'source') {
					throw Error(`Build config '${buildConfig.name}' has non-source input '${input}'`);
				}
				if (!file.buildable) {
					throw Error(`Build config '${buildConfig.name}' has non-buildable input '${input}'`);
				}
				if (!file.buildConfigs.has(buildConfig)) {
					promises.push(this.addSourceFileToBuild(file, buildConfig, true));
				}
			}
		}

		// Iterate through the files once and apply the filters to all source files.
		if (filters.length) {
			for (const file of this.files.values()) {
				if (file.type !== 'source') continue;
				for (let i = 0; i < filters.length; i++) {
					if (filters[i](file.id)) {
						// TODO this error condition may be hit if the `filerDir` is not buildable, correct?
						// give a better error message if that's the case!
						if (!file.buildable) throw Error(`Expected file to be buildable: ${file.id}`);
						const buildConfig = filterBuildConfigs[i];
						if (!file.buildConfigs.has(buildConfig)) {
							promises.push(this.addSourceFileToBuild(file, buildConfig, true));
						}
					}
				}
			}
		}

		await Promise.all(promises);

		// TODO I think this is where we run `esinstall` on these
		// but how to handle externals that are needed AFTER the Filer initializes?
		console.log('externals', this.externalDependencies);
	}

	// TODO track externals per build to match the flexibility of building local files
	externalDependencies = new Set<string>();

	// Adds a build config to a source file.
	// The caller is expected to check to avoid duplicates.
	private async addSourceFileToBuild(
		sourceFile: BuildableSourceFile,
		buildConfig: BuildConfig,
		isInput: boolean,
	): Promise<void> {
		if (sourceFile.buildConfigs.has(buildConfig)) {
			throw Error(`Expected to add buildConfig for ${buildConfig.name}:${sourceFile.id}`);
		}
		// Add the build config. The caller is expected to check to avoid duplicates.
		sourceFile.buildConfigs.add(buildConfig);
		// Add the build config as an input if appropriate, initializing the set if needed.
		// We need to determine `isInputToBuildConfig` independently of the caller,
		// because the caller may not
		if (isInput) {
			if (sourceFile.isInputToBuildConfigs === null) {
				// Cast to keep the `readonly` modifier outside of initialization.
				(sourceFile as Writable<
					BuildableSourceFile,
					'isInputToBuildConfigs'
				>).isInputToBuildConfigs = new Set();
			}
			sourceFile.isInputToBuildConfigs!.add(buildConfig);
		}

		// Build only if needed - build files may be hydrated from the cache.
		if (!sourceFile.buildFiles.has(buildConfig)) {
			await this.buildSourceFile(sourceFile, buildConfig);
		} else {
			await this.hydrateSourceFileFromCache(sourceFile, buildConfig);
		}
	}

	// Removes a build config from a source file.
	// The caller is expected to check to avoid duplicates.
	private async removeSourceFileFromBuild(
		sourceFile: BuildableSourceFile,
		buildConfig: BuildConfig,
	): Promise<void> {
		if (sourceFile.isInputToBuildConfigs?.has(buildConfig)) {
			throw Error(
				`Removing build configs from input files is not allowed: ${buildConfig}:${sourceFile.id}`,
			);
		}

		await this.updateBuildFiles(sourceFile, [], buildConfig);

		const deleted = sourceFile.buildConfigs.delete(buildConfig);
		if (!deleted) {
			throw Error(`Expected to delete buildConfig ${buildConfig}:${sourceFile.id}`);
		}
		const deletedBuildFiles = sourceFile.buildFiles.delete(buildConfig);
		if (!deletedBuildFiles) {
			throw Error(`Expected to delete build files ${buildConfig}:${sourceFile.id}`);
		}

		await this.updateCachedSourceInfo(sourceFile);
	}

	private onDirChange: FilerDirChangeCallback = async (change, filerDir) => {
		const id =
			filerDir.type === 'externals'
				? stripEnd(change.path, JS_EXTENSION)
				: join(filerDir.dir, change.path);
		switch (change.type) {
			case 'init':
			case 'create':
			case 'update': {
				if (change.stats.isDirectory()) {
					// We could ensure the directory, but it's usually wasted work,
					// and `fs-extra` takes care of adding missing directories when writing to disk.
				} else {
					const shouldCompile = await this.updateSourceFile(id, filerDir);
					if (
						shouldCompile &&
						// When initializing, compilation is deferred to `initBuilds`
						// so that deps are determined in the correct order.
						change.type !== 'init' &&
						filerDir.buildable // only needed for types, doing this instead of casting for type safety
					) {
						const file = this.files.get(id) as BuildableSourceFile;
						const promises: Promise<void>[] = [];
						for (const buildConfig of file.buildConfigs) {
							promises.push(this.buildSourceFile(file, buildConfig));
						}
						await Promise.all(promises);
					}
				}
				break;
			}
			case 'delete': {
				if (change.stats.isDirectory()) {
					if (this.buildConfigs !== null && filerDir.buildable) {
						// TODO This is weird because we're blindly deleting
						// the directory for all build configs,
						// whether or not they apply for this id.
						// It could be improved by tracking tracking dirs in the Filer
						// and looking up the correct build configs.
						await Promise.all(
							this.buildConfigs.map((buildConfig) =>
								remove(toBuildOutPath(this.dev, buildConfig.name, change.path, this.buildRootDir)),
							),
						);
					}
				} else {
					await this.destroySourceId(id);
				}
				break;
			}
			default:
				throw new UnreachableError(change.type);
		}
	};

	// Returns a boolean indicating if the source file should be compiled.
	// The source file may have been updated or created from a cold cache.
	private async updateSourceFile(id: string, filerDir: FilerDir): Promise<boolean> {
		const sourceFile = this.files.get(id);
		if (sourceFile !== undefined) {
			if (sourceFile.type !== 'source') {
				throw Error(`Expected to update a source file but got type '${sourceFile.type}': ${id}`);
			}
			if (sourceFile.filerDir !== filerDir) {
				// This can happen when watchers overlap, a file picked up by two `FilerDir`s.
				// We might be able to support this,
				// but more thought needs to be given to the exact desired behavior.
				// See `validateDirs` for more.
				throw Error(
					'Source file filerDir unexpectedly changed: ' +
						`${sourceFile.id} changed from ${sourceFile.filerDir.dir} to ${filerDir.dir}`,
				);
			}
		}

		let extension: string;
		let encoding: Encoding;
		if (sourceFile !== undefined) {
			extension = sourceFile.extension;
			encoding = sourceFile.encoding;
		} else if (filerDir.type === 'externals') {
			extension = JS_EXTENSION;
			encoding = 'utf8';
		} else {
			extension = extname(id);
			encoding = inferEncoding(extension);
		}
		const newSourceContents =
			filerDir.type === 'externals'
				? // TODO it may require additional changes,
				  // but the package.json version could be put here,
				  // allowing externals to update at runtime
				  ''
				: await loadContents(encoding, id);

		if (sourceFile === undefined) {
			// Memory cache is cold.
			const newSourceFile = await createSourceFile(
				id,
				encoding,
				extension,
				newSourceContents,
				filerDir,
				this.cachedSourceInfo.get(id),
				this.buildConfigs,
			);
			this.files.set(id, newSourceFile);
			// If the created source file has its build files hydrated from the cache,
			// we assume it doesn't need to be compiled.
			if (newSourceFile.buildable && newSourceFile.buildFiles.size !== 0) {
				return false;
			}
		} else if (
			areContentsEqual(encoding, sourceFile.contents, newSourceContents) &&
			// TODO hack to avoid the comparison for externals because they're compiled lazily
			!(sourceFile.sourceType === 'externals' && sourceFile.buildFiles.size === 0)
		) {
			// Memory cache is warm and source code hasn't changed, do nothing and exit early!
			return false;
		} else {
			// Memory cache is warm, but contents have changed.
			switch (sourceFile.encoding) {
				case 'utf8':
					sourceFile.contents = newSourceContents as string;
					sourceFile.stats = undefined;
					sourceFile.contentsBuffer = undefined;
					sourceFile.contentsHash = undefined;
					break;
				case null:
					sourceFile.contents = newSourceContents as Buffer;
					sourceFile.stats = undefined;
					sourceFile.contentsBuffer = newSourceContents as Buffer;
					sourceFile.contentsHash = undefined;
					break;
				default:
					throw new UnreachableError(sourceFile);
			}
		}
		return filerDir.buildable;
	}

	// These are used to avoid concurrent compilations for any given source file.
	private pendingCompilations = new Set<string>(); // value is `buildConfigName + sourceFileId`
	private enqueuedCompilations = new Set<string>(); // value is `buildConfigName + sourceFileId`

	// This wrapper function protects against race conditions
	// that could occur with concurrent compilations.
	// If a file is currently being compiled, it enqueues the file id,
	// and when the current compilation finishes,
	// it removes the item from the queue and recompiles the file.
	// The queue stores at most one compilation per file,
	// and this is safe given that compiling accepts no parameters.
	private async buildSourceFile(
		sourceFile: BuildableSourceFile,
		buildConfig: BuildConfig,
	): Promise<void> {
		const key = `${buildConfig.name}${sourceFile.id}`;
		if (this.pendingCompilations.has(key)) {
			this.enqueuedCompilations.add(key);
			return;
		}
		this.pendingCompilations.add(key);
		try {
			await this._buildSourceFile(sourceFile, buildConfig);
		} catch (err) {
			this.log.error(red('failed to compile'), printPath(sourceFile.id), printError(err));
		}
		this.pendingCompilations.delete(key);
		if (this.enqueuedCompilations.has(key)) {
			this.enqueuedCompilations.delete(key);
			// Something changed during the compilation for this file, so recurse.
			// This sequencing ensures that any awaiting callers always see the final version.
			// TODO do we need to detect cycles? if we run into any, probably
			const shouldCompile = await this.updateSourceFile(sourceFile.id, sourceFile.filerDir);
			if (shouldCompile) {
				await this.buildSourceFile(sourceFile, buildConfig);
			}
		}
	}

	private async _buildSourceFile(
		sourceFile: BuildableSourceFile,
		buildConfig: BuildConfig,
	): Promise<void> {
		this.log.info('build source file', sourceFile.id);

		// Compile the source file.
		const result = await sourceFile.filerDir.compiler.compile(sourceFile, buildConfig, this);

		const newBuildFiles: readonly BuildFile[] = result.compilations.map((compilation) =>
			createBuildFile(compilation, this, result, sourceFile, buildConfig),
		);

		// Update the source file with the new build files.
		await this.updateBuildFiles(sourceFile, newBuildFiles, buildConfig);
		await this.updateCachedSourceInfo(sourceFile);
	}

	// Updates the build files in the memory cache and writes to disk.
	private async updateBuildFiles(
		sourceFile: BuildableSourceFile,
		newBuildFiles: readonly BuildFile[],
		buildConfig: BuildConfig,
	): Promise<void> {
		const oldBuildFiles = sourceFile.buildFiles.get(buildConfig) || null;
		sourceFile.buildFiles.set(buildConfig, newBuildFiles);
		syncBuildFilesToMemoryCache(this.files, newBuildFiles, oldBuildFiles, this.log);
		await this.updateDependencies(sourceFile, newBuildFiles, oldBuildFiles, buildConfig);
		await syncFilesToDisk(newBuildFiles, oldBuildFiles, this.log);
	}

	// This is like `updateBuildFiles` except
	// it's called for source files when they're being hydrated from the cache.
	// This is because the normal build process ending with `updateBuildFiles`
	// is being short-circuited for efficiency, but parts of that process are still needed.
	private async hydrateSourceFileFromCache(
		sourceFile: BuildableSourceFile,
		buildConfig: BuildConfig,
	): Promise<void> {
		const buildFiles = sourceFile.buildFiles.get(buildConfig);
		if (buildFiles === undefined) {
			throw Error(`Expected to find build files when hydrating from cache.`);
		}
		syncBuildFilesToMemoryCache(this.files, buildFiles, null, this.log);
		await this.updateDependencies(sourceFile, buildFiles, null, buildConfig);
	}

	private async updateDependencies(
		sourceFile: BuildableSourceFile,
		newBuildFiles: readonly BuildFile[],
		oldBuildFiles: readonly BuildFile[] | null,
		buildConfig: BuildConfig,
	): Promise<void> {
		const diffResult = this.diffDependencies(newBuildFiles, oldBuildFiles, buildConfig);
		const addedDependencySourceFiles = diffResult && diffResult[0];
		const removedDependencySourceFiles = diffResult && diffResult[1];
		let promises: Promise<void>[] | null = null;
		if (addedDependencySourceFiles !== null) {
			for (const addedDependencySourceFile of addedDependencySourceFiles) {
				let dependents = addedDependencySourceFile.dependents.get(buildConfig);
				if (dependents === undefined) {
					dependents = new Set();
					addedDependencySourceFile.dependents.set(buildConfig, dependents);
				}
				dependents.add(sourceFile);
				if (!addedDependencySourceFile.buildConfigs.has(buildConfig)) {
					(promises || (promises = [])).push(
						this.addSourceFileToBuild(
							addedDependencySourceFile,
							buildConfig,
							isInputToBuildConfig(addedDependencySourceFile, buildConfig),
						),
					);
				}
			}
		}
		if (removedDependencySourceFiles !== null) {
			for (const removedDependencySourceFile of removedDependencySourceFiles) {
				if (!removedDependencySourceFile.buildConfigs.has(buildConfig)) {
					throw Error(
						`Expected build config: ${buildConfig.name}:${removedDependencySourceFile.id}`,
					);
				}
				let dependents = removedDependencySourceFile.dependents.get(buildConfig);
				if (dependents === undefined) {
					throw Error(`Expected dependents: ${buildConfig.name}:${removedDependencySourceFile.id}`);
				}
				dependents.delete(sourceFile);
				if (
					dependents.size === 0 &&
					!removedDependencySourceFile.isInputToBuildConfigs?.has(buildConfig)
				) {
					(promises || (promises = [])).push(
						this.removeSourceFileFromBuild(removedDependencySourceFile, buildConfig),
					);
				}
			}
		}

		if (promises !== null) await Promise.all(promises); // TODO parallelize with syncing to disk below (in `updateBuildFiles()`)?
	}

	diffDependencies(
		newBuildFiles: readonly BuildFile[],
		oldBuildFiles: readonly BuildFile[] | null,
		buildConfig: BuildConfig,
	):
		| null
		| [
				addedDependencySourceFiles: Set<BuildableSourceFile> | null,
				removedDependencySourceFiles: Set<BuildableSourceFile> | null,
		  ] {
		let addedDependencySourceFiles: Set<BuildableSourceFile> | null = null;
		let removedDependencySourceFiles: Set<BuildableSourceFile> | null = null;

		// After building the source file, we need to handle any dependency changes for each build file.
		// Dependencies may be added or removed,
		// and their source files need to be updated with any build config changes.
		// When a dependency is added for this build,
		// if the dependency's source file is not an input to the build config,
		// and it has 1 dependent after the build file is added,
		// they're added for this build,
		// meaning the memory cache is updated and the files are compiled to disk for the build config.
		// When a dependency is removed for this build,
		// if the dependency's source file is not an input to the build config,
		// and it has 0 dependents after the build file is removed,
		// they're removed for this build,
		// meaning the memory cache is updated and the files are deleted from disk for the build config.
		const diffResult = diffDependencies(newBuildFiles, oldBuildFiles);
		const addedDependencies = diffResult && diffResult[0];
		const removedDependencies = diffResult && diffResult[1];
		if (addedDependencies !== null) {
			for (const addedDependency of addedDependencies) {
				if (addedDependency.external) {
					if (buildConfig.platform === 'node') {
						continue;
					} else {
						throw Error(`TODO handle browser externals`);
					}
				}
				const addedSourceFile = this.findSourceFile(addedDependency.id);
				if (addedSourceFile === undefined) continue; // import might point to a nonexistent file
				if (!addedSourceFile.buildable) {
					throw Error(`Expected source file to be buildable: ${addedSourceFile.id}`);
				}
				(addedDependencySourceFiles || (addedDependencySourceFiles = new Set())).add(
					addedSourceFile,
				);
			}
		}
		if (removedDependencies !== null) {
			for (const removedDependency of removedDependencies) {
				if (removedDependency.external) {
					if (buildConfig.platform === 'node') {
						continue;
					} else {
						throw Error(`TODO handle browser externals`);
					}
				}
				const removedSourceFile = this.findSourceFile(removedDependency.id);
				if (removedSourceFile === undefined) continue; // import might point to a nonexistent file
				if (!removedSourceFile.buildable) {
					throw Error(`Expected dependency source file to be buildable: ${removedSourceFile.id}`);
				}
				(removedDependencySourceFiles || (removedDependencySourceFiles = new Set())).add(
					removedSourceFile,
				);
			}
		}

		return addedDependencySourceFiles !== null || removedDependencySourceFiles !== null
			? [addedDependencySourceFiles, removedDependencySourceFiles]
			: null;
	}

	private findSourceFile(buildId: string): SourceFile | undefined {
		const sourceId = this.mapBuildIdToSourceId(buildId);
		const sourceFile = this.files.get(sourceId);
		if (sourceFile !== undefined && sourceFile.type !== 'source') {
			throw Error(
				`Expected 'source' file but found '${sourceFile.type}': ${sourceId} via buildId '${buildId}'`,
			);
		}
		return sourceFile;
	}

	private async destroySourceId(id: string): Promise<void> {
		const sourceFile = this.files.get(id);
		if (!sourceFile || sourceFile.type !== 'source') return; // ignore compiled files (maybe throw an error if the file isn't found, should not happen)
		this.log.trace('destroying file', printPath(id));
		this.files.delete(id);
		if (sourceFile.buildable) {
			if (this.buildConfigs !== null) {
				await Promise.all(this.buildConfigs.map((b) => this.updateBuildFiles(sourceFile, [], b)));
			}
			await this.deleteCachedSourceInfo(sourceFile);
		}
	}

	// TODO as an optimization, this should be debounced per file,
	// because we're writing per build config.
	private async updateCachedSourceInfo(file: BuildableSourceFile): Promise<void> {
		if (file.buildConfigs.size === 0) return this.deleteCachedSourceInfo(file);
		const cachedSourceInfoId = toCachedSourceInfoId(
			file,
			this.buildRootDir,
			this.externalsDirBasePath,
		);
		const cachedSourceInfo: CachedSourceInfo = {
			sourceId: file.id,
			contentsHash: getFileContentsHash(file),
			compilations: Array.from(file.buildFiles.values()).flatMap((files) =>
				files.map((file) => ({
					id: file.id,
					buildConfigName: file.buildConfig.name,
					localDependencies: file.localDependencies && Array.from(file.localDependencies),
					externalDependencies: file.externalDependencies && Array.from(file.externalDependencies),
					encoding: file.encoding,
				})),
			),
		};
		// This is useful for debugging, but has false positives
		// when source changes but output doesn't, like if comments get elided.
		// if (
		// 	(await pathExists(cachedSourceInfoId)) &&
		// 	deepEqual(await readJson(cachedSourceInfoId), cachedSourceInfo)
		// ) {
		// 	console.log(
		// 		'wasted compilation detected! unchanged file was compiled and identical source info written to disk: ' +
		// 			cachedSourceInfoId,
		// 	);
		// }
		this.cachedSourceInfo.set(file.id, cachedSourceInfo);
		await outputFile(cachedSourceInfoId, JSON.stringify(cachedSourceInfo, null, 2));
	}

	private deleteCachedSourceInfo(file: BuildableSourceFile): Promise<void> {
		this.cachedSourceInfo.delete(file.id);
		return remove(toCachedSourceInfoId(file, this.buildRootDir, this.externalsDirBasePath));
	}
}

// Given `newFiles` and `oldFiles`, updates everything on disk,
// deleting files that no longer exist, writing new ones, and updating existing ones.
const syncFilesToDisk = async (
	newFiles: readonly BuildFile[],
	oldFiles: readonly BuildFile[] | null,
	log: Logger,
): Promise<void> => {
	// This uses `Array#find` because the arrays are expected to be small,
	// because we're currently only using it for individual file compilations,
	// but that assumption might change and cause this code to be slow.
	await Promise.all([
		oldFiles === null
			? null
			: Promise.all(
					oldFiles.map((oldFile) => {
						if (!newFiles.find((f) => f.id === oldFile.id)) {
							log.trace('deleting build file on disk', printPath(oldFile.id));
							return remove(oldFile.id);
						}
						return undefined;
					}),
			  ),
		Promise.all(
			newFiles.map(async (newFile) => {
				const oldFile = oldFiles?.find((f) => f.id === newFile.id);
				let shouldOutputNewFile = false;
				if (!oldFile) {
					if (!(await pathExists(newFile.id))) {
						log.trace('creating build file on disk', printPath(newFile.id));
						shouldOutputNewFile = true;
					} else {
						const existingCotents = await loadContents(newFile.encoding, newFile.id);
						if (!areContentsEqual(newFile.encoding, newFile.contents, existingCotents)) {
							log.trace('updating stale build file on disk', printPath(newFile.id));
							shouldOutputNewFile = true;
						} // ...else the build file on disk already matches what's in memory.
						// This can happen if the source file changed but this particular compiled file did not.
						// Loading the usually-stale contents into memory to check before writing is inefficient,
						// but it avoids unnecessary writing to disk and misleadingly updated file stats.
					}
				} else if (!areContentsEqual(newFile.encoding, newFile.contents, oldFile.contents)) {
					log.trace('updating build file on disk', printPath(newFile.id));
					shouldOutputNewFile = true;
				} // ...else the build file on disk already matches what's in memory.
				// This can happen if the source file changed but this particular compiled file did not.
				if (shouldOutputNewFile) await outputFile(newFile.id, newFile.contents);
			}),
		),
	]);
};

const toCachedSourceInfoId = (
	file: BuildableSourceFile,
	buildRootDir: string,
	externalsDirBasePath: string | null,
): string => {
	const basePath =
		file.sourceType === 'externals'
			? `${externalsDirBasePath}/${file.dirBasePath}`
			: file.dirBasePath;
	return `${buildRootDir}${CACHED_SOURCE_INFO_DIR}/${basePath}${file.filename}${JSON_EXTENSION}`;
};

// Given `newFiles` and `oldFiles`, updates the memory cache,
// deleting files that no longer exist and setting the new ones, replacing any old ones.
const syncBuildFilesToMemoryCache = (
	files: Map<string, BaseFilerFile>,
	newFiles: readonly BuildFile[],
	oldFiles: readonly BuildFile[] | null,
	_log: Logger,
): void => {
	// Remove any deleted files.
	// This uses `Array#find` because the arrays are expected to be small,
	// because we're currently only using it for individual file compilations,
	// but that assumption might change and cause this code to be slow.
	if (oldFiles !== null) {
		for (const oldFile of oldFiles) {
			if (!newFiles.find((f) => f.id === oldFile.id)) {
				// log.trace('deleting file from memory', printPath(oldFile.id));
				files.delete(oldFile.id);
			}
		}
	}
	// Add or update any new or changed files.
	for (const newFile of newFiles) {
		// log.trace('setting file in memory cache', printPath(newFile.id));
		const oldFile = files.get(newFile.id) as BuildFile | undefined;
		if (oldFile !== undefined) {
			// This check ensures that if the user provides multiple source directories
			// the compiled output files do not conflict.
			// There may be a better design warranted, but for now the goal is to support
			// the flexibility of multiple source directories while avoiding surprising behavior.
			if (newFile.sourceFileId !== oldFile.sourceFileId) {
				throw Error(
					'Two source files are trying to compile to the same output location: ' +
						`${newFile.sourceFileId} & ${oldFile.sourceFileId}`,
				);
			}
		}
		files.set(newFile.id, newFile);
	}
};

const areContentsEqual = (encoding: Encoding, a: string | Buffer, b: string | Buffer): boolean => {
	switch (encoding) {
		case 'utf8':
			return a === b;
		case null:
			return (a as Buffer).equals(b as Buffer);
		default:
			throw new UnreachableError(encoding);
	}
};

// TODO Revisit these restrictions - the goal right now is to set limits
// to avoid undefined behavior at the cost of flexibility.
// Some of these conditions like nested compiledDirs could be fixed
// but there are inefficiencies and possibly some subtle bugs.
const validateDirs = (
	compiledDirs: string[],
	externalsDir: string | null,
	buildRootDir: string,
) => {
	for (const compiledDir of compiledDirs) {
		const nestedCompiledDir = compiledDirs.find(
			(d) => d !== compiledDir && compiledDir.startsWith(d),
		);
		if (nestedCompiledDir) {
			throw Error(
				'A compiledDir cannot be inside another compiledDir: ' +
					`${compiledDir} is inside ${nestedCompiledDir}`,
			);
		}
		if (externalsDir !== null && compiledDir.startsWith(externalsDir)) {
			throw Error(
				'A compiledDir cannot be inside the externalsDir: ' +
					`${compiledDir} is inside ${externalsDir}`,
			);
		}
	}
	if (externalsDir !== null && !externalsDir.startsWith(buildRootDir)) {
		throw Error(
			'The externalsDir must be located inside the buildRootDir: ' +
				`${externalsDir} is not inside ${buildRootDir}`,
		);
	}
	const nestedCompiledDir =
		externalsDir !== null && compiledDirs.find((d) => externalsDir.startsWith(d));
	if (nestedCompiledDir) {
		throw Error(
			'The externalsDir cannot be inside a compiledDir: ' +
				`${externalsDir} is inside ${nestedCompiledDir}`,
		);
	}
};

// Creates objects to load a directory's contents and sync filesystem changes in memory.
// The order of objects in the returned array is meaningless.
const createFilerDirs = (
	compiledDirs: string[],
	servedDirs: ServedDir[],
	externalsDir: string | null,
	compiler: Compiler | null,
	buildRootDir: string,
	onChange: FilerDirChangeCallback,
	watch: boolean,
	watcherDebounce: number | undefined,
): FilerDir[] => {
	const dirs: FilerDir[] = [];
	for (const compiledDir of compiledDirs) {
		dirs.push(createFilerDir(compiledDir, 'files', compiler, onChange, watch, watcherDebounce));
	}
	if (externalsDir !== null) {
		dirs.push(
			createFilerDir(externalsDir, 'externals', compiler, onChange, false, watcherDebounce),
		);
	}
	for (const servedDir of servedDirs) {
		// If a `servedDir` is inside a compiled or externals directory,
		// it's already in the Filer's memory cache and does not need to be loaded as a directory.
		// Additionally, the same is true for `servedDir`s that are inside other `servedDir`s.
		if (
			!compiledDirs.find((d) => servedDir.dir.startsWith(d)) &&
			!(externalsDir !== null && servedDir.dir.startsWith(externalsDir)) &&
			!servedDirs.find((d) => d !== servedDir && servedDir.dir.startsWith(d.dir)) &&
			!servedDir.dir.startsWith(buildRootDir)
		) {
			dirs.push(createFilerDir(servedDir.dir, 'files', null, onChange, watch, watcherDebounce));
		}
	}
	return dirs;
};

const checkForConflictingExternalsDir = (
	servedDirs: readonly ServedDir[],
	externalsServedDir: ServedDir,
	externalsDirBasePath: string,
) =>
	Promise.all(
		servedDirs.map(async (servedDir) => {
			if (servedDir === externalsServedDir) return;
			if (await pathExists(`${servedDir.dir}/${externalsDirBasePath}`)) {
				throw Error(
					'A served directory contains a directory that conflicts with the externals directory.' +
						' One of them must be renamed to avoid import ambiguity.' +
						` ${servedDir.dir} contains "${externalsDirBasePath}"`,
				);
			}
		}),
	);

// TODO extract to utils and test
const defaultMapBuildIdToSourceId = (buildId: string): string =>
	basePathToSourceId(toSourceExtension(toBuildBasePath(buildId)));

const isInputToBuildConfig = (
	sourceFile: BuildableSourceFile,
	buildConfig: BuildConfig,
): boolean => {
	for (const input of buildConfig.input) {
		if (typeof input === 'string' ? sourceFile.id === input : input(sourceFile.id)) {
			return true;
		}
	}
	return false;
};
