import {basename, dirname} from 'node:path';
import {stripStart} from '@feltjs/util/string.js';

import type {FilerDir} from './filer_dir.js';
import {reconstruct_build_files, type BuildFile} from './buildFile.js';
import type {BaseFilerFile} from './filer_file.js';
import {toHash} from './helpers.js';
import type {BuildConfig} from './build_config.js';
import type {SourceMeta} from './sourceMeta.js';
import type {BuildDependency} from './buildDependency.js';
import type {BuildContext} from './builder.js';
import type {IdFilter} from '../fs/filter.js';
import type {BuildId, SourceId} from '../path/paths.js';

export type SourceFile = TextSourceFile;

export interface TextSourceFile extends BaseSourceFile {
	content: string;
}
export interface BaseSourceFile extends BaseFilerFile {
	readonly id: SourceId;
	readonly type: 'source';
	readonly dirBasePath: string; // TODO is this the best design? if so should it also go on the `BaseFilerFile`? what about `base_path` too?
	readonly filer_dir: FilerDir;
	readonly buildFiles: Map<BuildConfig, readonly BuildFile[]>;
	readonly build_configs: Set<BuildConfig>;
	readonly isInputToBuildConfigs: null | Set<BuildConfig>;
	readonly dependencies: Map<BuildConfig, Map<SourceId, Map<BuildId, BuildDependency>>>; // `dependencies` are sets of build ids by source file ids, that this one imports or otherwise depends on (they may point to nonexistent files!)
	readonly dependents: Map<BuildConfig, Map<SourceId, Map<BuildId, BuildDependency>>>; // `dependents` are sets of build ids by buildable source file ids, that import or otherwise depend on this one
	readonly virtual: boolean;
	dirty: boolean; // will be `true` for source files with hydrated files that need to rebuild (like detected changes since the filer last ran)
}

export const create_source_file = async (
	id: string,
	extension: string,
	content: string,
	filer_dir: FilerDir,
	sourceMeta: SourceMeta | undefined,
	virtual: boolean,
	{fs, build_configs}: BuildContext,
): Promise<SourceFile> => {
	let content_buffer: Buffer | undefined;
	let content_hash: string | undefined;
	let reconstructedBuildFiles: Map<BuildConfig, BuildFile[]> | null = null;
	let dirty = false;
	if (sourceMeta !== undefined) {
		content_buffer = Buffer.from(content);
		content_hash = toHash(content_buffer);

		// TODO not sure if `dirty` flag is the best solution here,
		// or if it should be more widely used?
		dirty = content_hash !== sourceMeta.data.content_hash;
		reconstructedBuildFiles = await reconstruct_build_files(fs, sourceMeta, build_configs!);
	}
	const filename = basename(id);
	const dir = dirname(id) + '/'; // TODO the slash is currently needed because paths.source_id and the rest have a trailing slash, but this may cause other problems
	const dirBasePath = stripStart(dir, filer_dir.dir + '/'); // TODO see above comment about `+ '/'`

	return {
		type: 'source',
		build_configs: new Set(),
		isInputToBuildConfigs: null,
		dependencies: new Map(),
		dependents: new Map(),
		virtual,
		dirty,
		id,
		filename,
		dir,
		dirBasePath,
		extension,
		content,
		content_buffer,
		content_hash,
		filer_dir,
		buildFiles: reconstructedBuildFiles || new Map(),
		stats: undefined,
	};
};

export function assert_source_file(
	file: BaseFilerFile | undefined | null,
): asserts file is SourceFile {
	if (file == null) {
		throw Error(`Expected a file but got ${file}`);
	}
	if (file.type !== 'source') {
		throw Error(`Expected a source file, but type is ${file.type}: ${file.id}`);
	}
}

export const filterDependents = (
	sourceFile: SourceFile,
	build_config: BuildConfig,
	findFileById: (id: string) => SourceFile | undefined,
	filter?: IdFilter | undefined,
	results: Set<string> = new Set(),
	searched: Set<string> = new Set(),
): Set<string> => {
	const dependentsForConfig = sourceFile.dependents?.get(build_config);
	if (!dependentsForConfig) return results;
	for (const dependentId of dependentsForConfig.keys()) {
		if (searched.has(dependentId)) continue;
		searched.add(dependentId);
		if (!filter || filter(dependentId)) {
			results.add(dependentId);
		}
		const dependentSourceFile = findFileById(dependentId)!;
		filterDependents(dependentSourceFile, build_config, findFileById, filter, results, searched);
	}
	return results;
};
