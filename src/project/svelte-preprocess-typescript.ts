import ts from 'typescript';
import {PreprocessorGroup} from 'svelte/types/compiler/preprocess';
import {magenta, red} from 'kleur/colors';

import {SystemLogger, Logger} from '../utils/log.js';
import {loadTsconfig} from './tsHelpers.js';
import {printPath} from '../utils/print.js';
import {omitUndefined} from '../utils/object.js';

/*

This preprocessor transpiles the script portion of Svelte files
if the script tag has a `lang="typescript"` attribute.
No typechecking is performed - that's left for a separate build step.

*/

export interface Options {
	langs: string[];
	tsconfigPath: string | undefined;
}
export type RequiredOptions = never;
export type InitialOptions = PartialExcept<Options, RequiredOptions>;
export const initOptions = (opts: InitialOptions): Options => ({
	langs: ['typescript'],
	tsconfigPath: undefined,
	...omitUndefined(opts),
});

const name = 'svelte-preprocess-typescript';

export const sveltePreprocessTypescript = (opts: InitialOptions = {}): PreprocessorGroup => {
	const {langs, tsconfigPath} = initOptions(opts);

	const log = new SystemLogger([magenta(`[${name}]`)]);

	const tsconfig = loadTsconfig(log, tsconfigPath);

	return {
		script({content, attributes, filename}) {
			if (!langs.includes(attributes.lang as any)) return null as any; // type is wrong
			log.info('transpiling', printPath(filename || ''));
			const transpileOptions: ts.TranspileOptions = {
				compilerOptions: tsconfig.compilerOptions,
				fileName: filename,
				// reportDiagnostics?: boolean;
				// moduleName?: string;
				// renamedDependencies?: MapLike<string>;
				transformers: customTransformersForTranspile(log),
			};
			let transpileOutput;
			try {
				transpileOutput = ts.transpileModule(content, transpileOptions);
			} catch (err) {
				log.error(red('Failed to transpile TypeScript'), printPath(filename || ''));
				throw err;
			}
			// TODO sourcemap - does Svelte need to add support for preprocessor sourcemaps?
			const {outputText /* diagnostics, sourceMapText */} = transpileOutput;
			// trace('outputText', outputText);
			return {code: outputText};
		},
	};
};

// These have the suffix `ForTranspile` to emphasize there's no typechecking.
const customTransformersForTranspile = (log: Logger): ts.CustomTransformers => ({
	before: [importTransformerForTranspile(log)],
});

const importTransformerForTranspile: (
	_log: Logger,
) => ts.TransformerFactory<ts.SourceFile> = () => (context) => {
	const visit: ts.Visitor = (node) => {
		if (ts.isImportDeclaration(node)) {
			// TODO this preserves all imports, but I don't fully understand how it works,
			// or if it should be done differently
			// console.log('module specifier', node.moduleSpecifier.getText());
			const result = ts.createImportDeclaration(
				node.decorators,
				node.modifiers,
				node.importClause,
				node.moduleSpecifier,
			);
			// console.log('VISIT result', result);
			return result;
		}
		return ts.visitEachChild(node, (child) => visit(child), context);
	};
	return (node) => ts.visitNode(node, visit);
};
