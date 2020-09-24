import {
	rollup,
	watch,
	OutputOptions,
	InputOptions,
	RollupWatchOptions,
	RollupOutput,
	RollupBuild,
} from 'rollup';
import resolvePlugin from '@rollup/plugin-node-resolve';
import commonjsPlugin from '@rollup/plugin-commonjs';
import {resolve} from 'path';
import swc from '@swc/core';

import {magenta} from '../colors/terminal.js';
import {rainbow} from '../colors/terminal.js';
import {SystemLogger, Logger} from '../utils/log.js';
import {diagnosticsPlugin} from './rollup-plugin-diagnostics.js';
import {deindent} from '../utils/string.js';
import {plainCssPlugin} from './rollup-plugin-plain-css.js';
import {outputCssPlugin} from './rollup-plugin-output-css.js';
import {createCssCache, CssCache} from './cssCache.js';
import {groJsonPlugin} from './rollup-plugin-gro-json.js';
import {groTerserPlugin} from './rollup-plugin-gro-terser.js';
import {groSwcPlugin} from './rollup-plugin-gro-swc.js';
import {groSveltePlugin} from './rollup-plugin-gro-svelte.js';
import {GroCssBuild} from './types.js';
import {sveltePreprocessSwc} from './svelte-preprocess-swc.js';
import {omitUndefined} from '../utils/object.js';
import {UnreachableError} from '../utils/error.js';
import {identity} from '../utils/function.js';

export interface Options {
	swcOptions: swc.Options;
	dev: boolean;
	sourceMap: boolean;
	inputFiles: string[];
	outputDir: string;
	watch: boolean;
	mapInputOptions: MapInputOptions;
	mapOutputOptions: MapOutputOptions;
	mapWatchOptions: MapWatchOptions;
	cssCache: CssCache<GroCssBuild>;
}
export type RequiredOptions = 'swcOptions';
export type InitialOptions = PartialExcept<Options, RequiredOptions>;
export const initOptions = (opts: InitialOptions): Options => ({
	dev: true,
	sourceMap: opts.dev ?? true,
	inputFiles: [resolve('index.ts')],
	outputDir: resolve('dist/'),
	watch: true,
	mapInputOptions: identity,
	mapOutputOptions: identity,
	mapWatchOptions: identity,
	cssCache: opts.cssCache || createCssCache(),
	...omitUndefined(opts),
});

interface Build {
	promise: Promise<void>;
}
export type MapInputOptions = (o: InputOptions, b: Options) => InputOptions;
export type MapOutputOptions = (o: OutputOptions, b: Options) => OutputOptions;
export type MapWatchOptions = (o: RollupWatchOptions, b: Options) => RollupWatchOptions;

export const createBuild = (opts: InitialOptions): Build => {
	const options = initOptions(opts);

	const log = new SystemLogger([magenta('[build]')]);

	log.trace('build options', options);

	const promise = runBuild(options, log);

	return {promise};
};

const runBuild = async (options: Options, log: Logger): Promise<void> => {
	log.info(`building for ${options.dev ? 'development' : 'production'}`);

	// run rollup
	if (options.watch) {
		// run the watcher
		log.info('building and watching');
		await runRollupWatcher(options, log);
		log.info('stopped watching');
	} else {
		// build the js
		log.info('building');
		await runRollupBuild(options, log);
		log.info(
			'\n' +
				rainbow(
					deindent(`
						~~~~~~~~~~~~~~~~~
						~~❤~~ built ~~❤~~
						~~~~~~~~~~~~~~~~~
				`),
				),
		);
	}
};

const createInputOptions = (inputFile: string, options: Options, _log: Logger): InputOptions => {
	const {dev, sourceMap, cssCache, swcOptions} = options;

	// TODO make this extensible - how? should bundles be combined for production builds?
	const addPlainCssBuild = cssCache.addCssBuild.bind(null, 'bundle.plain.css');
	const addSvelteCssBuild = cssCache.addCssBuild.bind(null, 'bundle.svelte.css');

	const unmappedInputOptions: InputOptions = {
		// — core input options
		// external,
		input: inputFile, // required
		plugins: [
			diagnosticsPlugin(),
			groJsonPlugin({compact: !dev}),
			groSveltePlugin({
				dev,
				addCssBuild: addSvelteCssBuild,
				preprocessor: [sveltePreprocessSwc({swcOptions})],
				compileOptions: {},
			}),
			groSwcPlugin({swcOptions}),
			plainCssPlugin({addCssBuild: addPlainCssBuild}),
			outputCssPlugin({
				getCssBundles: cssCache.getCssBundles,
				sourcemap: sourceMap,
			}),
			resolvePlugin(),
			commonjsPlugin(),
			...(dev ? [] : [groTerserPlugin({minifyOptions: {sourceMap: sourceMap}})]),
		],

		// — advanced input options
		// cache,
		// inlineDynamicImports,
		// manualChunks,
		// onwarn,
		// preserveModules,

		// — danger zone
		// acorn,
		// acornInjectPlugins,
		// context,
		// moduleContext,
		// preserveSymlinks,
		// shimMissingExports,
		// treeshake,

		// — experimental
		// chunkGroupingSize,
		// experimentalCacheExpiry,
		// experimentalOptimizeChunks,
		// experimentalTopLevelAwait,
		// perf
	};
	const inputOptions = options.mapInputOptions(unmappedInputOptions, options);
	// log.trace('inputOptions', inputOptions);
	return inputOptions;
};

const createOutputOptions = (options: Options, log: Logger): OutputOptions => {
	const unmappedOutputOptions: OutputOptions = {
		// — core output options
		dir: options.outputDir,
		// file,
		format: 'esm', // required
		// globals,
		name: 'app',

		// — advanced output options
		// assetFileNames,
		// banner,
		// chunkFileNames,
		// compact,
		// entryFileNames,
		// extend,
		// footer,
		// interop,
		// intro,
		// outro,
		// paths,
		sourcemap: options.sourceMap,
		// sourcemapExcludeSources,
		// sourcemapFile,
		// sourcemapPathTransform,

		// — danger zone
		// amd,
		// dynamicImportFunction,
		// esModule,
		// exports,
		// freeze,
		// indent,
		// namespaceToStringTag,
		// noConflict,
		// preferConst,
		// strict
	};
	const outputOptions = options.mapOutputOptions(unmappedOutputOptions, options);
	log.trace('outputOptions', outputOptions);
	return outputOptions;
};

const createWatchOptions = (
	inputFile: string,
	options: Options,
	log: Logger,
): RollupWatchOptions => {
	const unmappedWatchOptions: RollupWatchOptions = {
		...createInputOptions(inputFile, options, log),
		output: createOutputOptions(options, log),
		watch: {
			// chokidar,
			clearScreen: false,
			exclude: ['node_modules/**'],
			// include,
		},
	};
	const watchOptions = options.mapWatchOptions(unmappedWatchOptions, options);
	// log.trace('watchOptions', watchOptions);
	return watchOptions;
};

interface BuildResult {
	build: RollupBuild;
	output: RollupOutput;
}

const runRollupBuild = async (options: Options, log: Logger): Promise<BuildResult[]> => {
	// We're running builds sequentially,
	// because doing them in parallel makes the logs incomprehensible.
	// Maybe make parallel an option?
	const results: BuildResult[] = [];
	for (const inputFile of options.inputFiles) {
		const inputOptions = createInputOptions(inputFile, options, log);
		const outputOptions = createOutputOptions(options, log);

		const build = await rollup(inputOptions);

		const output = await build.generate(outputOptions);

		// for (const chunkOrAsset of output.output) {
		//   if (chunkOrAsset.isAsset) {
		//     // For assets, this contains
		//     // {
		//     //   isAsset: true,                 // signifies that this is an asset
		//     //   fileName: string,              // the asset file name
		//     //   source: string | Buffer        // the asset source
		//     // }
		//     console.log('Asset', chunkOrAsset);
		//   } else {
		//     // For chunks, this contains
		//     // {
		//     //   code: string,                  // the generated JS code
		//     //   dynamicImports: string[],      // external modules imported dynamically by the chunk
		//     //   exports: string[],             // exported variable names
		//     //   facadeModuleId: string | null, // the id of a module that this chunk corresponds to
		//     //   fileName: string,              // the chunk file name
		//     //   imports: string[],             // external modules imported statically by the chunk
		//     //   isDynamicEntry: boolean,       // is this chunk a dynamic entry point
		//     //   isEntry: boolean,              // is this chunk a static entry point
		//     //   map: string | null,            // sourcemaps if present
		//     //   modules: {                     // information about the modules in this chunk
		//     //     [id: string]: {
		//     //       renderedExports: string[]; // exported variable names that were included
		//     //       removedExports: string[];  // exported variable names that were removed
		//     //       renderedLength: number;    // the length of the remaining code in this module
		//     //       originalLength: number;    // the original length of the code in this module
		//     //     };
		//     //   },
		//     //   name: string                   // the name of this chunk as used in naming patterns
		//     // }
		//     console.log('Chunk', chunkOrAsset.modules);
		//   }
		// }

		await build.write(outputOptions); // don't care about the output of this - maybe refactor

		results.push({build, output});
	}
	return results;
};

const runRollupWatcher = async (options: Options, log: Logger): Promise<void> => {
	return new Promise((_resolve, reject) => {
		const watchOptions = options.inputFiles.map((f) => createWatchOptions(f, options, log));
		// trace(('watchOptions'), watchOptions);
		const watcher = watch(watchOptions);

		watcher.on('event', (event) => {
			log.info(`rollup event: ${event.code}`);
			switch (event.code) {
				case 'START': // the watcher is (re)starting
				case 'BUNDLE_START': // building an individual bundle
				case 'BUNDLE_END': // finished building a bundle
					break;
				case 'END': // finished building all bundles
					log.info(rainbow('~~end~~'), '\n\n');
					break;
				case 'ERROR': // encountered an error while bundling
					log.error('error', event);
					reject(`Error: ${event.error.message}`);
					break;
				default:
					throw new UnreachableError(event);
			}
		});

		// call this ever?
		// watcher.close();
	});
};
