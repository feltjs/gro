import {basename, dirname} from 'path';
import {UnreachableError} from '@feltcoop/felt/util/error.js';
import {stripStart} from '@feltcoop/felt/util/string.js';

import type {FilerDir} from './filerDir.js';
import {reconstructBuildFiles, type BuildFile} from './buildFile.js';
import type {BaseFilerFile} from './filerFile.js';
import {toHash} from './utils.js';
import type {BuildConfig} from './buildConfig.js';
import type {Encoding} from '../fs/encoding.js';
import type {FilerFile} from './Filer.js';
import type {SourceMeta} from './sourceMeta.js';
import type {BuildDependency} from './buildDependency.js';
import type {BuildContext} from './builder.js';

export type SourceFile = TextSourceFile | BinarySourceFile;

export interface TextSourceFile extends BaseSourceFile {
	readonly encoding: 'utf8';
	content: string;
}
export interface BinarySourceFile extends BaseSourceFile {
	readonly encoding: null;
	content: Buffer;
	contentBuffer: Buffer;
}
export interface BaseSourceFile extends BaseFilerFile {
	readonly type: 'source';
	readonly dirBasePath: string; // TODO is this the best design? if so should it also go on the `BaseFilerFile`? what about `basePath` too?
	readonly filerDir: FilerDir;
	readonly buildFiles: Map<BuildConfig, readonly BuildFile[]>;
	readonly buildConfigs: Set<BuildConfig>;
	readonly isInputToBuildConfigs: null | Set<BuildConfig>;
	readonly dependencies: Map<BuildConfig, Map<string, Map<string, BuildDependency>>>; // `dependencies` are sets of build ids by source file ids, that this one imports or otherwise depends on (they may point to nonexistent files!)
	readonly dependents: Map<BuildConfig, Map<string, Map<string, BuildDependency>>>; // `dependents` are sets of build ids by buildable source file ids, that import or otherwise depend on this one
	dirty: boolean; // will be `true` for source files with hydrated files that need to rebuild (like detected changes since the filer last ran)
}

export const createSourceFile = async (
	id: string,
	encoding: Encoding,
	extension: string,
	content: string | Buffer,
	filerDir: FilerDir,
	sourceMeta: SourceMeta | undefined,
	{fs, buildConfigs}: BuildContext,
): Promise<SourceFile> => {
	let contentBuffer: Buffer | undefined = encoding === null ? (content as Buffer) : undefined;
	let contentHash: string | undefined = undefined;
	let reconstructedBuildFiles: Map<BuildConfig, BuildFile[]> | null = null;
	let dirty = false;
	if (sourceMeta !== undefined) {
		// TODO why the source meta guard here for `contentBuffer` and `contentHash`?
		if (encoding === 'utf8') {
			contentBuffer = Buffer.from(content);
		} else if (encoding !== null) {
			throw new UnreachableError(encoding);
		}
		contentHash = toHash(contentBuffer!);

		// TODO not sure if `dirty` flag is the best solution here,
		// or if it should be more widely used?
		dirty = contentHash !== sourceMeta.data.contentHash;
		reconstructedBuildFiles = await reconstructBuildFiles(fs, sourceMeta, buildConfigs!);
	}
	const filename = basename(id);
	const dir = dirname(id) + '/'; // TODO the slash is currently needed because paths.sourceId and the rest have a trailing slash, but this may cause other problems
	const dirBasePath = stripStart(dir, filerDir.dir + '/'); // TODO see above comment about `+ '/'`
	switch (encoding) {
		case 'utf8':
			return {
				type: 'source',
				buildConfigs: new Set(),
				isInputToBuildConfigs: null,
				dependencies: new Map(),
				dependents: new Map(),
				dirty,
				id,
				filename,
				dir,
				dirBasePath,
				extension,
				encoding,
				content: content as string,
				contentBuffer,
				contentHash,
				filerDir,
				buildFiles: reconstructedBuildFiles || new Map(),
				stats: undefined,
				mimeType: undefined,
			};
		case null:
			return {
				type: 'source',
				buildConfigs: new Set(),
				isInputToBuildConfigs: null,
				dependencies: new Map(),
				dependents: new Map(),
				dirty,
				id,
				filename,
				dir,
				dirBasePath,
				extension,
				encoding,
				content: content as Buffer,
				contentBuffer: contentBuffer!,
				contentHash,
				filerDir,
				buildFiles: reconstructedBuildFiles || new Map(),
				stats: undefined,
				mimeType: undefined,
			};
		default:
			throw new UnreachableError(encoding);
	}
};

export function assertSourceFile(file: FilerFile | undefined | null): asserts file is SourceFile {
	if (file == null) {
		throw Error(`Expected a file but got ${file}`);
	}
	if (file.type !== 'source') {
		throw Error(`Expected a source file, but type is ${file.type}: ${file.id}`);
	}
}
