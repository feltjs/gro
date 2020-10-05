import {resolve, extname, join, basename, dirname} from 'path';
import lexer from 'es-module-lexer';

import {ensureDir, stat, Stats} from './nodeFs.js';
import {watchNodeFs, DEBOUNCE_DEFAULT, WatcherChange} from '../fs/watchNodeFs.js';
import type {WatchNodeFs} from '../fs/watchNodeFs.js';
import {
	hasSourceExtension,
	JS_EXTENSION,
	paths,
	SVELTE_EXTENSION,
	toBuildOutDir,
} from '../paths.js';
import {omitUndefined} from '../utils/object.js';
import {findFiles, readFile, remove, outputFile, pathExists} from '../fs/nodeFs.js';
import {UnreachableError} from '../utils/error.js';
import {Logger, SystemLogger} from '../utils/log.js';
import {magenta, red} from '../colors/terminal.js';
import {printError, printPath} from '../utils/print.js';
import type {
	Compiler,
	TextCompilation,
	BinaryCompilation,
	Compilation,
} from '../compile/compiler.js';
import {getMimeTypeByExtension} from './mime.js';
import {Encoding, inferEncoding} from './encoding.js';
import {replaceExtension} from '../utils/path.js';
import {BuildConfig} from '../project/buildConfig.js';
import {stripStart} from '../utils/string.js';

export type FilerFile = SourceFile | CompiledFile; // TODO or Directory? source/compiled directory?

export type SourceFile = CompilableSourceFile | NonCompilableSourceFile;
export type CompilableSourceFile = CompilableTextSourceFile | CompilableBinarySourceFile;
export type NonCompilableSourceFile = NonCompilableTextSourceFile | NonCompilableBinarySourceFile;
export interface TextSourceFile extends BaseSourceFile {
	readonly encoding: 'utf8';
	readonly contents: string;
}
export interface BinarySourceFile extends BaseSourceFile {
	readonly encoding: null;
	readonly contents: Buffer;
	readonly buffer: Buffer;
}
interface BaseSourceFile extends BaseFile {
	readonly type: 'source';
	readonly dirBasePath: string; // TODO is this the best design? if so should it also go on the `BaseFile`? what about `basePath` too?
}
export interface CompilableTextSourceFile extends TextSourceFile {
	readonly compilable: true;
	readonly sourceDir: CompilableSourceDir;
	readonly compiledFiles: CompiledFile[];
}
export interface CompilableBinarySourceFile extends BinarySourceFile {
	readonly compilable: true;
	readonly sourceDir: CompilableSourceDir;
	readonly compiledFiles: CompiledFile[];
}
export interface NonCompilableTextSourceFile extends TextSourceFile {
	readonly compilable: false;
	readonly sourceDir: NonCompilableSourceDir;
	readonly compiledFiles: null;
}
export interface NonCompilableBinarySourceFile extends BinarySourceFile {
	readonly compilable: false;
	readonly sourceDir: NonCompilableSourceDir;
	readonly compiledFiles: null;
}

export type CompiledFile = CompiledTextFile | CompiledBinaryFile;
export interface CompiledTextFile extends BaseCompiledFile {
	readonly compilation: TextCompilation;
	readonly encoding: 'utf8';
	readonly contents: string;
	readonly sourceMapOf: string | null; // TODO maybe prefer a union with an `isSourceMap` boolean flag?
}
export interface CompiledBinaryFile extends BaseCompiledFile {
	readonly compilation: BinaryCompilation;
	readonly encoding: null;
	readonly contents: Buffer;
	readonly buffer: Buffer;
}
interface BaseCompiledFile extends BaseFile {
	readonly type: 'compiled';
	readonly sourceFile: CompilableSourceFile;
}

export interface BaseFile {
	readonly id: string;
	readonly filename: string;
	readonly dir: string;
	readonly extension: string;
	readonly encoding: Encoding;
	readonly contents: string | Buffer;
	buffer: Buffer | undefined; // `undefined` and mutable for lazy loading
	stats: Stats | undefined; // `undefined` and mutable for lazy loading
	mimeType: string | null | undefined; // `null` means unknown, `undefined` and mutable for lazy loading
}

export interface Options {
	dev: boolean;
	compiler: Compiler | null;
	buildConfigs: BuildConfig[] | null;
	buildRootDir: string;
	compiledDirs: string[];
	servedDirs: string[];
	include: (id: string) => boolean;
	sourceMap: boolean;
	debounce: number;
	watch: boolean;
	cleanOutputDirs: boolean;
	log: Logger;
}
export type InitialOptions = Partial<Options>;
export const initOptions = (opts: InitialOptions): Options => {
	const dev = opts.dev ?? true;
	const buildConfigs = opts.buildConfigs || null;
	const buildRootDir = opts.buildRootDir || paths.build;
	const compiledDirs = opts.compiledDirs ? opts.compiledDirs.map((d) => resolve(d)) : [];
	validateCompiledDirs(compiledDirs);
	// default to serving all of the compiled output files
	const servedDirs = Array.from(
		new Set(
			(
				opts.servedDirs ||
				(buildConfigs === null
					? []
					: [
							toBuildOutDir(
								dev,
								(buildConfigs.find((c) => c.platform === 'browser') || buildConfigs[0]).name,
								'',
								buildRootDir,
							),
					  ])
			).map((d) => resolve(d)),
		),
	);
	if (!compiledDirs.length && !servedDirs.length) {
		throw Error('Filer created with no directories to compile or serve.');
	}
	const compiler = opts.compiler || null;
	if (compiledDirs.length && !compiler) {
		throw Error('Filer created with directories to compile but no compiler was provided.');
	}
	if (compiler && !compiledDirs.length) {
		throw Error('Filer created with a compiler but no directories to compile.');
	}
	return {
		dev,
		sourceMap: true,
		debounce: DEBOUNCE_DEFAULT,
		watch: true,
		cleanOutputDirs: true,
		...omitUndefined(opts),
		include: opts.include || (() => true),
		log: opts.log || new SystemLogger([magenta('[filer]')]),
		compiler,
		buildConfigs,
		buildRootDir,
		compiledDirs,
		servedDirs,
	};
};

export class Filer {
	private readonly dev: boolean;
	private readonly compiler: Compiler | null;
	private readonly buildConfigs: BuildConfig[] | null;
	private readonly buildRootDir: string;
	private readonly servedDirs: string[];
	private readonly sourceMap: boolean;
	private readonly cleanOutputDirs: boolean;
	private readonly log: Logger;
	private readonly dirs: SourceDir[];
	private readonly include: (id: string) => boolean;

	private readonly files: Map<string, FilerFile> = new Map();

	constructor(opts: InitialOptions) {
		const {
			dev,
			compiler,
			buildConfigs,
			buildRootDir,
			compiledDirs,
			servedDirs,
			include,
			sourceMap,
			debounce,
			watch,
			cleanOutputDirs,
			log,
		} = initOptions(opts);
		this.dev = dev;
		this.compiler = compiler;
		this.buildConfigs = buildConfigs;
		this.buildRootDir = buildRootDir;
		this.servedDirs = servedDirs;
		this.include = include;
		this.sourceMap = sourceMap;
		this.cleanOutputDirs = cleanOutputDirs;
		this.log = log;
		this.dirs = createSourceDirs(
			compiledDirs,
			servedDirs,
			buildRootDir,
			watch,
			debounce,
			this.onSourceDirChange,
		);
	}

	// Searches for a file matching `path`, limited to the directories that are served.
	findByPath(path: string): BaseFile | null {
		for (const servedDir of this.servedDirs) {
			const id = `${servedDir}/${path}`;
			const file = this.files.get(id);
			if (file) return file;
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

		await Promise.all([Promise.all(this.dirs.map((d) => d.init())), lexer.init]);

		const {buildConfigs} = this;
		if (this.cleanOutputDirs && buildConfigs !== null) {
			// Clean the dev output directories,
			// removing any files that can't be mapped back to source files.
			// For now, this does not handle production output.
			// See the comments where `dev` is declared for more.
			// (more accurately, it could handle prod, but not simultaneous to dev)
			const buildOutDirs: string[] = buildConfigs.map((buildConfig) =>
				toBuildOutDir(this.dev, buildConfig.name, '', this.buildRootDir),
			);
			await Promise.all(
				buildOutDirs.map(async (outputDir) => {
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

		finishInitializing!();
	}

	private onSourceDirChange: SourceDirChangeCallback = async (
		change: WatcherChange,
		sourceDir: SourceDir,
	) => {
		const id = join(sourceDir.dir, change.path);
		switch (change.type) {
			case 'create':
			case 'update': {
				if (change.stats.isDirectory()) {
					// We could ensure the directory, but it's usually wasted work,
					// and `fs-extra` takes care of adding missing directories when writing to disk.
				} else {
					if (await this.updateSourceFile(id, sourceDir)) {
						await this.compileSourceId(id, sourceDir);
					}
				}
				break;
			}
			case 'delete': {
				if (change.stats.isDirectory()) {
					if (this.buildConfigs !== null && sourceDir.compilable) {
						await Promise.all(
							this.buildConfigs.map((buildConfig) =>
								remove(toBuildOutDir(this.dev, buildConfig.name, change.path, this.buildRootDir)),
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

	// Returns a boolean indicating if the source file changed.
	private async updateSourceFile(id: string, sourceDir: SourceDir): Promise<boolean> {
		const sourceFile = this.files.get(id);
		if (sourceFile) {
			if (sourceFile.type !== 'source') {
				throw Error(`Expected to update a source file but got type '${sourceFile.type}': ${id}`);
			}
			if (sourceFile.sourceDir !== sourceDir) {
				// This can happen when there are overlapping watchers.
				// We might be able to support this,
				// but more thought needs to be given to the exact desired behavior.
				// See `validateCompiledDirs` for more.
				throw Error(
					'Source file sourceDir unexpectedly changed: ' +
						`${sourceFile.id} changed from ${sourceFile.sourceDir.dir} to ${sourceDir.dir}`,
				);
			}
		}

		let extension: string;
		let encoding: Encoding;
		if (sourceFile) {
			extension = sourceFile.extension;
			encoding = sourceFile.encoding;
		} else {
			extension = extname(id);
			encoding = inferEncoding(extension);
		}
		const newSourceContents = await loadContents(encoding, id);

		let newSourceFile: SourceFile;
		if (!sourceFile) {
			// Memory cache is cold.
			// TODO add hash caching to avoid this work when not needed
			// (base on source id hash comparison combined with compile options diffing like sourcemaps and ES target)
			newSourceFile = createSourceFile(id, encoding, extension, newSourceContents, sourceDir);
		} else if (areContentsEqual(encoding, sourceFile.contents, newSourceContents)) {
			// Memory cache is warm and source code hasn't changed, do nothing and exit early!
			// But wait, what if the source maps are missing because the `sourceMap` option was off
			// the last time the files were built?
			// We're going to assume that if the source maps exist, they're in sync,
			// in the same way that we're assuming that the build file is in sync if it exists
			// when the cached source file hasn't changed.
			// TODO remove this check once we diff compiler options
			if (
				!this.sourceMap ||
				(sourceFile.compiledFiles !== null && (await sourceMapsAreBuilt(sourceFile)))
			) {
				return false;
			}
			newSourceFile = sourceFile;
		} else {
			// Memory cache is warm, but contents have changed.
			switch (sourceFile.encoding) {
				case 'utf8':
					newSourceFile = {
						...sourceFile,
						contents: newSourceContents as string,
						stats: undefined,
						buffer: undefined,
					};
					break;
				case null:
					newSourceFile = {
						...sourceFile,
						contents: newSourceContents as Buffer,
						stats: undefined,
						buffer: newSourceContents as Buffer,
					};
					break;
				default:
					throw new UnreachableError(sourceFile);
			}
		}
		this.files.set(id, newSourceFile);
		return true;
	}

	// These are used to avoid concurrent compilations for any given source file.
	private pendingCompilations: Set<string> = new Set();
	private enqueuedCompilations: Map<string, [string, SourceDir]> = new Map();

	// This wrapper function protects against race conditions
	// that could occur with concurrent compilations.
	// If a file is currently being compiled, it enqueues the file id,
	// and when the current compilation finishes,
	// it removes the item from the queue and recompiles the file.
	// The queue stores at most one compilation per file,
	// and this is safe given that compiling accepts no parameters.
	private async compileSourceId(id: string, sourceDir: SourceDir): Promise<void> {
		if (this.buildConfigs === null || sourceDir.compilable === false || !this.include(id)) {
			return;
		}
		if (this.pendingCompilations.has(id)) {
			this.enqueuedCompilations.set(id, [id, sourceDir]);
			return;
		}
		this.pendingCompilations.add(id);
		try {
			await this._compileSourceId(id);
		} catch (err) {
			this.log.error(red('failed to compile'), printPath(id), printError(err));
		}
		this.pendingCompilations.delete(id);
		const enqueuedCompilation = this.enqueuedCompilations.get(id);
		if (enqueuedCompilation !== undefined) {
			this.enqueuedCompilations.delete(id);
			// Something changed during the compilation for this file, so recurse.
			// TODO do we need to detect cycles? if we run into any, probably
			if (await this.updateSourceFile(...enqueuedCompilation)) {
				await this.compileSourceId(...enqueuedCompilation);
			}
		}
	}

	private async _compileSourceId(id: string): Promise<void> {
		const sourceFile = this.files.get(id);
		if (!sourceFile) {
			throw Error(`Cannot find source file: ${id}`);
		}
		if (sourceFile.type !== 'source') {
			throw Error(`Cannot compile file with type '${sourceFile.type}': ${id}`);
		}
		if (sourceFile.compilable === false) {
			throw Error(`Cannot compile a non-compilable source file: ${id}`);
		}

		// Compile the source file.
		// TODO support production builds
		// The Filer is designed to be able to be a long-lived process
		// that can output builds for both development and production,
		// but for now it's hardcoded to development, and production is entirely done by Rollup.
		const results = await Promise.all(
			this.buildConfigs!.map((buildConfig) =>
				this.compiler!.compile(sourceFile, buildConfig, this.buildRootDir, this.dev),
			),
		);

		// Update the cache and write to disk.
		const newCompiledFiles = results.flatMap((result) =>
			result.compilations.map(
				(compilation): CompiledFile => {
					switch (compilation.encoding) {
						case 'utf8':
							return {
								type: 'compiled',
								sourceFile,
								id: compilation.id,
								filename: compilation.filename,
								dir: compilation.dir,
								extension: compilation.extension,
								encoding: compilation.encoding,
								contents: postprocess(compilation),
								sourceMapOf: compilation.sourceMapOf,
								compilation,
								stats: undefined,
								mimeType: undefined,
								buffer: undefined,
							};
						case null:
							return {
								type: 'compiled',
								sourceFile,
								id: compilation.id,
								filename: compilation.filename,
								dir: compilation.dir,
								extension: compilation.extension,
								encoding: compilation.encoding,
								contents: postprocess(compilation),
								compilation,
								stats: undefined,
								mimeType: undefined,
								buffer: compilation.contents,
							};
						default:
							throw new UnreachableError(compilation);
					}
				},
			),
		);
		const newSourceFile = {...sourceFile, compiledFiles: newCompiledFiles};
		this.files.set(id, newSourceFile);
		const oldCompiledFiles = sourceFile.compiledFiles;
		syncCompiledFilesToMemoryCache(this.files, newCompiledFiles, oldCompiledFiles, this.log);
		await syncFilesToDisk(newCompiledFiles, oldCompiledFiles, this.log);
	}

	private async destroySourceId(id: string): Promise<void> {
		const sourceFile = this.files.get(id);
		if (!sourceFile || sourceFile.type !== 'source') return; // ignore compiled files (maybe throw an error if the file isn't found, should not happen)
		this.log.trace('destroying file', printPath(id));
		this.files.delete(id);
		if (sourceFile.compiledFiles !== null) {
			syncCompiledFilesToMemoryCache(this.files, [], sourceFile.compiledFiles, this.log);
			await syncFilesToDisk([], sourceFile.compiledFiles, this.log);
		}
	}
}

// The check is needed to handle source maps being toggled on and off.
// It assumes that if we find any source maps, the rest are there.
const sourceMapsAreBuilt = async (sourceFile: CompilableSourceFile): Promise<boolean> => {
	const sourceMapFile = sourceFile.compiledFiles.find((f) =>
		f.encoding === 'utf8' ? f.sourceMapOf : false,
	);
	if (!sourceMapFile) return true;
	return pathExists(sourceMapFile.id);
};

// Given `newFiles` and `oldFiles`, updates everything on disk,
// deleting files that no longer exist, writing new ones, and updating existing ones.
const syncFilesToDisk = async (
	newFiles: CompiledFile[],
	oldFiles: CompiledFile[],
	log: Logger,
): Promise<void> => {
	// This uses `Array#find` because the arrays are expected to be small,
	// because we're currently only using it for individual file compilations,
	// but that assumption might change and cause this code to be slow.
	await Promise.all([
		...oldFiles.map((oldFile) => {
			if (!newFiles.find((f) => f.id === oldFile.id)) {
				log.trace('deleting file on disk', printPath(oldFile.id));
				return remove(oldFile.id);
			}
			return undefined;
		}),
		...newFiles.map(async (newFile) => {
			const oldFile = oldFiles.find((f) => f.id === newFile.id);
			let shouldOutputNewFile = false;
			if (!oldFile) {
				if (!(await pathExists(newFile.id))) {
					log.trace('creating file on disk', printPath(newFile.id));
					shouldOutputNewFile = true;
				} else {
					// TODO optimize - content hash cache?
					const existingCotents = await loadContents(newFile.encoding, newFile.id);
					if (!areContentsEqual(newFile.encoding, newFile.contents, existingCotents)) {
						log.trace('updating stale file on disk', printPath(newFile.id));
						shouldOutputNewFile = true;
					} // else the file on disk is already updated
				}
			} else if (!areContentsEqual(newFile.encoding, newFile.contents, oldFile.contents)) {
				log.trace('updating file on disk', printPath(newFile.id));
				shouldOutputNewFile = true;
			} // else nothing changed, no need to update
			if (shouldOutputNewFile) await outputFile(newFile.id, newFile.contents);
		}),
	]);
};

// Given `newFiles` and `oldFiles`, updates the memory cache,
// deleting files that no longer exist and setting the new ones, replacing any old ones.
const syncCompiledFilesToMemoryCache = (
	files: Map<string, BaseFile>,
	newFiles: CompiledFile[],
	oldFiles: CompiledFile[],
	_log: Logger,
): void => {
	// This uses `Array#find` because the arrays are expected to be small,
	// because we're currently only using it for individual file compilations,
	// but that assumption might change and cause this code to be slow.
	for (const oldFile of oldFiles) {
		if (!newFiles.find((f) => f.id === oldFile.id)) {
			// log.trace('deleting file from memory', printPath(oldFile.id));
			files.delete(oldFile.id);
		}
	}
	for (const newFile of newFiles) {
		// log.trace('setting file in memory cache', printPath(newFile.id));
		const oldFile = files.get(newFile.id) as CompiledFile | undefined;
		if (oldFile !== undefined) {
			// This check ensures that if the user provides multiple source directories
			// the compiled output files do not conflict.
			// There may be a better design warranted, but for now the goal is to support
			// the flexibility of multiple source directories while avoiding surprising behavior.
			if (newFile.sourceFile.id !== oldFile.sourceFile.id) {
				throw Error(
					'Two source files are trying to compile to the same output location: ' +
						`${newFile.sourceFile.id} & ${oldFile.sourceFile.id}`,
				);
			}
		}
		files.set(newFile.id, newFile);
	}
};

export const getFileMimeType = (file: BaseFile): string | null =>
	file.mimeType !== undefined
		? file.mimeType
		: (file.mimeType = getMimeTypeByExtension(file.extension.substring(1)));

export const getFileBuffer = (file: BaseFile): Buffer =>
	file.buffer !== undefined ? file.buffer : (file.buffer = Buffer.from(file.contents));

// Stats are currently lazily loaded. Should they be?
export const getFileStats = (file: BaseFile): Stats | Promise<Stats> =>
	file.stats !== undefined
		? file.stats
		: stat(file.id).then((stats) => {
				file.stats = stats;
				return stats;
		  }); // TODO catch?

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

const loadContents = (encoding: Encoding, id: string): Promise<string | Buffer> =>
	encoding === null ? readFile(id) : readFile(id, encoding);

// TODO this needs some major refactoring and redesigning
function postprocess(compilation: TextCompilation): string;
function postprocess(compilation: BinaryCompilation): Buffer;
function postprocess(compilation: Compilation) {
	if (compilation.encoding === 'utf8' && compilation.extension === JS_EXTENSION) {
		let result = '';
		let index = 0;
		const {contents} = compilation;
		// TODO what should we pass as the second arg to parse? the id? nothing? `lexer.parse(code, id);`
		const [imports] = lexer.parse(contents);
		for (const {s, e, d} of imports) {
			const start = d > -1 ? s + 1 : s;
			const end = d > -1 ? e - 1 : e;
			const moduleName = contents.substring(start, end);
			if (moduleName.endsWith(SVELTE_EXTENSION)) {
				result += contents.substring(index, start) + replaceExtension(moduleName, JS_EXTENSION);
				index = end;
			}
		}
		if (index > 0) {
			return result + contents.substring(index);
		} else {
			return contents;
		}
	}
	return compilation.contents;
}

// TODO revisit these restrictions - the goal right now is to set limits
// to avoid undefined behavior at the cost of flexibility
const validateCompiledDirs = (compiledDirs: string[]) => {
	for (const compiledDir of compiledDirs) {
		// Make sure no `compiledDir` is inside another `compiledDir`.
		// This could be fixed and the current implementation appears to work, if inefficiently,
		// only throwing an error when it detects that a source file's `sourceDir` has changed.
		// However there may be subtle bugs caused by source files changing their `watcherDir`,
		// so for now we err on the side of caution and less complexity.
		const nestedCompiledDir = compiledDirs.find(
			(d) => d !== compiledDir && compiledDir.startsWith(d),
		);
		if (nestedCompiledDir) {
			throw Error(
				'A compiledDir cannot be inside another compiledDir: ' +
					`${compiledDir} is inside ${nestedCompiledDir}`,
			);
		}
	}
};

const createSourceFile = (
	id: string,
	encoding: Encoding,
	extension: string,
	newSourceContents: string | Buffer,
	sourceDir: SourceDir,
): SourceFile => {
	const filename = basename(id);
	const dir = dirname(id) + '/'; // TODO the slash is currently needed because paths.sourceId and the rest have a trailing slash, but this may cause other problems
	const dirBasePath = stripStart(dir, sourceDir.dir + '/'); // TODO see above comment about `+ '/'`
	switch (encoding) {
		case 'utf8':
			return sourceDir.compilable
				? {
						type: 'source',
						compilable: true,
						id,
						filename,
						dir,
						dirBasePath,
						extension,
						encoding,
						contents: newSourceContents as string,
						sourceDir,
						compiledFiles: [],
						stats: undefined,
						mimeType: undefined,
						buffer: undefined,
				  }
				: {
						type: 'source',
						compilable: false,
						id,
						filename,
						dir,
						dirBasePath,
						extension,
						encoding,
						contents: newSourceContents as string,
						sourceDir,
						compiledFiles: null,
						stats: undefined,
						mimeType: undefined,
						buffer: undefined,
				  };
		case null:
			return sourceDir.compilable
				? {
						type: 'source',
						compilable: true,
						id,
						filename,
						dir,
						dirBasePath,
						extension,
						encoding,
						contents: newSourceContents as Buffer,
						sourceDir,
						compiledFiles: [],
						stats: undefined,
						mimeType: undefined,
						buffer: newSourceContents as Buffer,
				  }
				: {
						type: 'source',
						compilable: false,
						id,
						filename,
						dir,
						dirBasePath,
						extension,
						encoding,
						contents: newSourceContents as Buffer,
						sourceDir,
						compiledFiles: null,
						stats: undefined,
						mimeType: undefined,
						buffer: newSourceContents as Buffer,
				  };
		default:
			throw new UnreachableError(encoding);
	}
};

// Creates objects to load a directory's contents and sync filesystem changes in memory.
// The order of objects in the returned array is meaningless.
const createSourceDirs = (
	compiledDirs: string[],
	servedDirs: string[],
	buildRootDir: string,
	watch: boolean,
	debounce: number,
	onChange: SourceDirChangeCallback,
): SourceDir[] => {
	const dirs: SourceDir[] = [];
	for (const sourceDir of compiledDirs) {
		// The `outDir` is automatically in the Filer's memory cache for compiled files,
		// so no need to load it as a directory.
		dirs.push(createSourceDir(sourceDir, true, watch, debounce, onChange));
	}
	if (watch) {
		for (const servedDir of servedDirs) {
			// If a `servedDir` is inside a compiled directory,
			// it's already in the Filer's memory cache and does not need to be loaded as a directory.
			// Additionally, the same is true for `servedDir`s that are inside other `servedDir`s.
			// TODO what about `servedDirs` that are inside the `buildRootDir` but aren't compiled?
			if (
				!compiledDirs.find((d) => servedDir.startsWith(d)) &&
				!servedDirs.find((d) => d !== servedDir && servedDir.startsWith(d)) &&
				!servedDir.startsWith(buildRootDir)
			) {
				dirs.push(createSourceDir(servedDir, false, watch, debounce, onChange));
			}
		}
	}
	return dirs;
};

// There are two kinds of `SourceDir`s, those that are compilable and those that are not.
// Compilable source dirs are compiled and written to disk.
// For non-compilable ones, the `dir` is only watched and nothing is written to the filesystem.
type SourceDir = CompilableSourceDir | NonCompilableSourceDir;
type SourceDirChangeCallback = (change: WatcherChange, sourceDir: SourceDir) => Promise<void>;
interface CompilableSourceDir extends BaseSourceDir {
	readonly compilable: true;
}
interface NonCompilableSourceDir extends BaseSourceDir {
	readonly compilable: false;
}
interface BaseSourceDir {
	readonly dir: string;
	readonly watcher: WatchNodeFs;
	readonly onChange: SourceDirChangeCallback;
	readonly close: () => void;
	readonly init: () => Promise<void>;
}
const createSourceDir = (
	dir: string,
	compilable: boolean,
	watch: boolean,
	debounce: number,
	onChange: SourceDirChangeCallback,
): SourceDir => {
	const watcher = watchNodeFs({
		dir,
		debounce,
		watch,
		onChange: (change) => onChange(change, sourceDir),
	});
	const close = () => {
		watcher.close();
	};
	const init = async () => {
		await ensureDir(dir);
		const statsBySourcePath = await watcher.init();
		await Promise.all(
			Array.from(statsBySourcePath.entries()).map(([path, stats]) =>
				stats.isDirectory() ? null : onChange({type: 'update', path, stats}, sourceDir),
			),
		);
	};
	const sourceDir: SourceDir = {compilable, dir, onChange, watcher, close, init};
	return sourceDir;
};
