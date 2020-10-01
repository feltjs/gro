import {join} from 'path';

import {omitUndefined} from '../utils/object.js';
import {UnreachableError} from '../utils/error.js';

export interface Compiler<T extends Compilation = Compilation> {
	compile(source: CompilationSource): CompileResult<T> | Promise<CompileResult<T>>;
}

export interface CompileResult<T extends Compilation = Compilation> {
	compilations: T[];
}

export type Compilation = TextCompilation | BinaryCompilation;
export interface TextCompilation extends BaseCompilation {
	encoding: 'utf8';
	contents: string;
	sourceMapOf: string | null; // TODO for source maps? hmm. maybe we want a union with an `isSourceMap` boolean flag?
}
export interface BinaryCompilation extends BaseCompilation {
	encoding: null;
	contents: Buffer;
}
interface BaseCompilation {
	id: string;
	filename: string;
	dir: string;
	extension: string;
}

export type CompilationSource = TextCompilationSource | BinaryCompilationSource;
export interface TextCompilationSource extends BaseCompilationSource {
	encoding: 'utf8';
	contents: string;
}
export interface BinaryCompilationSource extends BaseCompilationSource {
	encoding: null;
	contents: Buffer;
}
interface BaseCompilationSource {
	id: string;
	filename: string;
	dir: string;
	extension: string;
	outDir: string;
}

export interface GetCompiler {
	(source: CompilationSource): Compiler | null;
}

export interface Options {
	getCompiler: GetCompiler;
}
export type InitialOptions = Partial<Options>;
export const initOptions = (opts: InitialOptions): Options => {
	return {
		getCompiler: getNoopCompiler,
		...omitUndefined(opts),
	};
};

export const createCompiler = (opts: InitialOptions = {}): Compiler => {
	const {getCompiler} = initOptions(opts);

	const compile: Compiler['compile'] = (source: CompilationSource) => {
		const compiler = getCompiler(source) || noopCompiler;
		return compiler.compile(source);
	};

	return {compile};
};

const createNoopCompiler = (): Compiler => {
	const compile: Compiler['compile'] = (source: CompilationSource) => {
		const {filename, extension, outDir} = source;
		const id = join(outDir, filename); // TODO this is broken, needs to account for dirs
		let file: Compilation;
		switch (source.encoding) {
			case 'utf8':
				file = {
					id,
					filename,
					dir: outDir,
					extension,
					encoding: source.encoding,
					contents: source.contents,
					sourceMapOf: null,
				};
				break;
			case null:
				file = {
					id,
					filename,
					dir: outDir,
					extension,
					encoding: source.encoding,
					contents: source.contents,
				};
				break;
			default:
				throw new UnreachableError(source);
		}
		return {compilations: [file]};
	};
	return {compile};
};
export const noopCompiler = createNoopCompiler();
export const getNoopCompiler: GetCompiler = () => noopCompiler;
