import {JS_EXTENSION, to_build_out_path} from '../path/paths.js';
import type {Builder} from './builder.js';
import type {TextSourceFile} from './sourceFile.js';

export interface Options {
	optimize?: boolean; // see `toJsonJsContent` below
}

type JsonBuilder = Builder<TextSourceFile>;

export const groBuilderJson = (options: Options = {}): JsonBuilder => {
	const {optimize = true} = options;
	return {
		name: 'groBuilderJson',
		build: (source, buildConfig, {build_dir, dev}) => {
			const {filename} = source;
			const outDir = to_build_out_path(dev, buildConfig.name, source.dirBasePath, build_dir);
			return [
				{
					type: 'build',
					source_id: source.id,
					buildConfig,
					dependencies: null,
					id: `${outDir}${filename}${JS_EXTENSION}`,
					filename,
					dir: outDir,
					extension: JS_EXTENSION,
					encoding: 'utf8',
					content: toJsonJsContent(source.content, optimize),
					contentBuffer: undefined,
					contentHash: undefined,
					stats: undefined,
					mimeType: undefined,
				},
			];
		},
	};
};

// Optimization described here:
// https://v8.dev/blog/cost-of-javascript-2019#json
// https://v8.dev/features/subsume-json#embedding-json-parse
const toJsonJsContent = (content: string, optimize: boolean): string =>
	optimize ? `export default JSON.parse(${JSON.stringify(content)})` : `export default ${content}`;
