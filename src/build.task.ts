import {pathExists} from './fs/nodeFs.js';
import type {Task} from './task/task.js';
import {createBuild} from './project/build.js';
import {getDefaultEsbuildOptions} from './build/esbuildBuildHelpers.js';
import {loadTsconfig, toEcmaScriptTarget} from './build/tsBuildHelpers.js';
import {toBuildOutPath} from './paths.js';
import {Timings} from './utils/time.js';
import {loadGroConfig} from './config/config.js';
import {configureLogLevel} from './utils/log.js';
import type {BuildConfig} from './config/buildConfig.js';

process.env.NODE_ENV = 'production';
const dev = false; // forcing prod builds for now

export const task: Task = {
	description: 'build the project',
	run: async ({log, args}): Promise<void> => {
		const timings = new Timings();

		if (dev) {
			log.warn('building in development mode; normally this is only for diagnostics');
		}
		const watch: boolean = (args.watch as any) || false;
		const mapInputOptions = args.mapInputOptions as any;
		const mapOutputOptions = args.mapOutputOptions as any;
		const mapWatchOptions = args.mapWatchOptions as any;

		const timingToLoadConfig = timings.start('load config');
		const config = await loadGroConfig();
		configureLogLevel(config.logLevel);
		timingToLoadConfig();
		args.oncreateconfig && (args as any).oncreateconfig(config);

		// TODO this is outdated - needs to be updated with the Gro config (see `dev.task.ts`)
		const tsconfigPath = undefined; // TODO parameterized options?
		const basePath = undefined; // TODO parameterized options?
		const tsconfig = loadTsconfig(log, tsconfigPath, basePath);
		const target = toEcmaScriptTarget(tsconfig.compilerOptions?.target);
		const sourcemap = tsconfig.compilerOptions?.sourceMap ?? true;
		const esbuildOptions = getDefaultEsbuildOptions(target, sourcemap);

		// For each build config, infer which of the inputs
		// are actual source files, and therefore belong in the default Rollup build.
		// If more customization is needed, users should implement their own `src/build.task.ts`,
		// which can be bootstrapped by copy/pasting this one. (and updating the imports)
		await Promise.all(
			config.builds.map(async (buildConfig) => {
				const inputFiles = await resolveInputFiles(buildConfig);
				log.info(`building "${buildConfig.name}"`, inputFiles);
				if (inputFiles.length) {
					const outputDir = toBuildOutPath(dev, buildConfig.name);
					const build = createBuild({
						dev,
						sourcemap,
						inputFiles,
						outputDir,
						watch,
						mapInputOptions,
						mapOutputOptions,
						mapWatchOptions,
						esbuildOptions,
					});
					await build.promise;
				} else {
					log.warn(`no input files in build "${buildConfig.name}"`);
				}
			}),
		);

		// ...
	},
};

// TODO use `resolveRawInputPaths`? consider the virtual fs - use the `Filer` probably
const resolveInputFiles = async (buildConfig: BuildConfig): Promise<string[]> => {
	return (
		await Promise.all(
			buildConfig.input.map(async (input) => {
				console.log('input', input);
				return typeof input === 'string' && (await pathExists(input)) ? input : null!;
			}),
		)
	).filter(Boolean);

	// if no file names are provided, add a default if it exists
	// if (!fileNames.length) {
	// 	for (const name of DEFAULT_INPUT_NAMES) {
	// 		const path = resolve(name);
	// 		if (await pathExists(path)) {
	// 			fileNames = [name];
	// 			break;
	// 		}
	// 	}
	// }
	// const inputFiles = fileNames.map((f) => resolve(f));
	// for (const file of inputFiles) {
	// 	if (!(await pathExists(file))) {
	// 		throw Error(`Input file not found: ${file}`);
	// 	}
	// }
	// return inputFiles;
};
