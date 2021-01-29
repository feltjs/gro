import svelte from 'svelte/compiler.js';
import {PreprocessorGroup} from 'svelte/types/compiler/preprocess';
import {CompileOptions as SvelteCompileOptions} from 'svelte/types/compiler/interfaces';

import {EcmaScriptTarget} from './tsHelpers.js';
import {getDefaultSwcOptions} from './swcHelpers.js';
import {
	baseSvelteCompileOptions,
	handleStats,
	handleWarn,
	SvelteCompilation,
} from './svelteHelpers.js';
import {Logger, SystemLogger} from '../utils/log.js';
import {
	CSS_EXTENSION,
	JS_EXTENSION,
	SOURCEMAP_EXTENSION,
	SVELTE_EXTENSION,
	toBuildOutPath,
} from '../paths.js';
import {sveltePreprocessSwc} from '../project/svelte-preprocess-swc.js';
import {omitUndefined} from '../utils/object.js';
import {Compiler, TextCompilation, TextCompilationSource} from './compiler.js';
import {BuildConfig} from '../config/buildConfig.js';
import {UnreachableError} from '../utils/error.js';
import {cyan} from '../colors/terminal.js';
import {addCssSourceMapFooter, addJsSourceMapFooter} from './helpers.js';

export interface Options {
	log: Logger;
	// TODO changes to this by consumers can break caching - how can the DX be improved?
	createPreprocessor: CreatePreprocessor;
	// TODO how to support options like this without screwing up caching?
	// maybe compilers need a way to declare their options so they (or a hash) can be cached?
	svelteCompileOptions: SvelteCompileOptions;
	onwarn: typeof handleWarn;
	onstats: typeof handleStats | null;
}
export type InitialOptions = Partial<Options>;
export const initOptions = (opts: InitialOptions): Options => {
	return {
		onwarn: handleWarn,
		onstats: null,
		createPreprocessor: createDefaultPreprocessor,
		...omitUndefined(opts),
		log: opts.log || new SystemLogger([cyan('[svelteCompiler]')]),
		svelteCompileOptions: opts.svelteCompileOptions || {},
	};
};

type SvelteCompiler = Compiler<TextCompilationSource, TextCompilation>;

export const createSvelteCompiler = (opts: InitialOptions = {}): SvelteCompiler => {
	const {log, createPreprocessor, svelteCompileOptions, onwarn, onstats} = initOptions(opts);

	const preprocessorCache: Map<string, PreprocessorGroup | PreprocessorGroup[] | null> = new Map();
	const getPreprocessor = (
		sourceMap: boolean,
		target: EcmaScriptTarget,
	): PreprocessorGroup | PreprocessorGroup[] | null => {
		const key = sourceMap + target;
		const existingPreprocessor = preprocessorCache.get(key);
		if (existingPreprocessor !== undefined) return existingPreprocessor;
		const newPreprocessor = createPreprocessor(sourceMap, target);
		preprocessorCache.set(key, newPreprocessor);
		return newPreprocessor;
	};

	const compile: SvelteCompiler['compile'] = async (
		source,
		buildConfig,
		{buildRootDir, dev, sourceMap, target},
	) => {
		if (source.encoding !== 'utf8') {
			throw Error(`swc only handles utf8 encoding, not ${source.encoding}`);
		}
		if (source.extension !== SVELTE_EXTENSION) {
			throw Error(`svelte only handles ${SVELTE_EXTENSION} files, not ${source.extension}`);
		}
		const {id, encoding, contents} = source;
		const outDir = toBuildOutPath(dev, buildConfig.name, source.dirBasePath, buildRootDir);
		let preprocessedCode: string;

		// TODO see rollup-plugin-svelte for how to track deps
		// let dependencies = [];
		const preprocessor = getPreprocessor(sourceMap, target);
		if (preprocessor !== null) {
			const preprocessed = await svelte.preprocess(contents, preprocessor, {filename: id});
			preprocessedCode = preprocessed.code;
			// dependencies = preprocessed.dependencies; // TODO
		} else {
			preprocessedCode = contents;
		}

		const output: SvelteCompilation = svelte.compile(preprocessedCode, {
			...baseSvelteCompileOptions,
			dev,
			generate: getGenerateOption(buildConfig),
			...svelteCompileOptions,
			filename: id, // TODO should we be giving a different path?
		});
		const {js, css, warnings, stats} = output;

		for (const warning of warnings) {
			onwarn(id, warning, handleWarn, log);
		}
		if (onstats) onstats(id, stats, handleStats, log);

		const jsFilename = `${source.filename}${JS_EXTENSION}`;
		const cssFilename = `${source.filename}${CSS_EXTENSION}`;
		const jsId = `${outDir}${jsFilename}`;
		const cssId = `${outDir}${cssFilename}`;
		const hasJsSourceMap = sourceMap && js.map !== undefined;
		const hasCssSourceMap = sourceMap && css.map !== undefined;

		const compilations: TextCompilation[] = [
			{
				id: jsId,
				filename: jsFilename,
				dir: outDir,
				extension: JS_EXTENSION,
				encoding,
				contents: hasJsSourceMap
					? addJsSourceMapFooter(js.code, jsFilename + SOURCEMAP_EXTENSION)
					: js.code,
				sourceMapOf: null,
				buildConfig,
			},
		];
		if (hasJsSourceMap) {
			compilations.push({
				id: jsId + SOURCEMAP_EXTENSION,
				filename: jsFilename + SOURCEMAP_EXTENSION,
				dir: outDir,
				extension: SOURCEMAP_EXTENSION,
				encoding,
				contents: JSON.stringify(js.map), // TODO do we want to also store the object version?
				sourceMapOf: jsId,
				buildConfig,
			});
		}
		if (css.code) {
			compilations.push({
				id: cssId,
				filename: cssFilename,
				dir: outDir,
				extension: CSS_EXTENSION,
				encoding,
				contents: hasCssSourceMap
					? addCssSourceMapFooter(css.code, cssFilename + SOURCEMAP_EXTENSION)
					: css.code,
				sourceMapOf: null,
				buildConfig,
			});
			if (hasCssSourceMap) {
				compilations.push({
					id: cssId + SOURCEMAP_EXTENSION,
					filename: cssFilename + SOURCEMAP_EXTENSION,
					dir: outDir,
					extension: SOURCEMAP_EXTENSION,
					encoding,
					contents: JSON.stringify(css.map), // TODO do we want to also store the object version?
					sourceMapOf: cssId,
					buildConfig,
				});
			}
		}
		return {compilations};
	};

	return {compile};
};

const getGenerateOption = (buildConfig: BuildConfig): 'dom' | 'ssr' | false => {
	switch (buildConfig.platform) {
		case 'browser':
			return 'dom';
		case 'node':
			return 'ssr';
		default:
			throw new UnreachableError(buildConfig.platform);
	}
};

type CreatePreprocessor = (
	sourceMap: boolean,
	target: EcmaScriptTarget,
) => PreprocessorGroup | PreprocessorGroup[] | null;

const createDefaultPreprocessor: CreatePreprocessor = (sourceMap, target) =>
	sveltePreprocessSwc({swcOptions: getDefaultSwcOptions(target, sourceMap)});
