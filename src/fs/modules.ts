import {red} from '../colors/terminal.js';
import {pathExists, stat} from './nodeFs.js';
import {printPath, printError, printPathOrGroPath} from '../utils/print.js';
import {loadSourcePathDataByInputPath, loadSourceIdsByInputPath} from '../fs/inputPath.js';
import {Timings} from '../utils/time.js';
import {PathStats, PathData} from './pathData.js';
import {toImportId, pathsFromId} from '../paths.js';
import {UnreachableError} from '../utils/error.js';

/*

The main functions here, `findModules` and `loadModules`/`loadModule`,
cleanly separate finding from loading.
This has significant performance consequences and is friendly to future changes.
Currently the implementations only use the filesystem,
but eventually we'll have an in-memory virtual filesystem for dev watch mode.

*/

export interface ModuleMeta<ModuleType = Obj> {
	id: string;
	mod: ModuleType;
}

export type LoadModuleResult<T> = {ok: true; mod: T} | LoadModuleFailure;
export type LoadModuleFailure =
	| {ok: false; type: 'importFailed'; id: string; error: Error}
	| {ok: false; type: 'invalid'; id: string; mod: Obj; validation: string};

export const loadModule = async <T>(
	id: string,
	validate?: (mod: Obj) => mod is T,
): Promise<LoadModuleResult<ModuleMeta<T>>> => {
	let mod;
	try {
		mod = await import(toImportId(id));
	} catch (err) {
		return {ok: false, type: 'importFailed', id, error: err};
	}
	if (validate && !validate(mod)) {
		return {ok: false, type: 'invalid', id, mod, validation: validate.name};
	}
	return {ok: true, mod: {id, mod}};
};

export type FindModulesResult = FindModulesSuccess | FindModulesFailure;
export type FindModulesSuccess = {
	ok: true;
	sourceIdsByInputPath: Map<string, string[]>;
	sourceIdPathDataByInputPath: Map<string, PathData>;
	timings: Timings<FindModulesTimings>;
};
export type FindModulesFailure =
	| {
			ok: false;
			type: 'unmappedInputPaths';
			sourceIdPathDataByInputPath: Map<string, PathData>;
			unmappedInputPaths: string[];
			reasons: string[];
	  }
	| {
			ok: false;
			type: 'inputDirectoriesWithNoFiles';
			sourceIdsByInputPath: Map<string, string[]>;
			sourceIdPathDataByInputPath: Map<string, PathData>;
			inputDirectoriesWithNoFiles: string[];
			reasons: string[];
	  };
type FindModulesTimings = 'map input paths' | 'find files';

export type LoadModulesResult<ModuleMetaType extends ModuleMeta> =
	| {
			ok: true;
			modules: ModuleMetaType[];
			timings: Timings<LoadModulesTimings>;
	  }
	| {
			ok: false;
			type: 'loadModuleFailures';
			loadModuleFailures: LoadModuleFailure[];
			reasons: string[];
			// still return the modules and timings, deferring to the caller
			modules: ModuleMetaType[];
			timings: Timings<LoadModulesTimings>;
	  };
type LoadModulesTimings = 'load modules';

/*

Finds modules from input paths. (see `src/fs/inputPath.ts` for more)

*/
export const findModules = async (
	inputPaths: string[],
	findFiles: (id: string) => Promise<Map<string, PathStats>>,
	getPossibleSourceIds?: (inputPath: string) => string[],
): Promise<FindModulesResult> => {
	// Check which extension variation works - if it's a directory, prefer others first!
	const timings = new Timings<FindModulesTimings>();
	timings.start('map input paths');
	const {sourceIdPathDataByInputPath, unmappedInputPaths} = await loadSourcePathDataByInputPath(
		inputPaths,
		pathExists,
		stat,
		getPossibleSourceIds,
	);
	timings.stop('map input paths');

	// Error if any input path could not be mapped.
	if (unmappedInputPaths.length) {
		return {
			ok: false,
			type: 'unmappedInputPaths',
			sourceIdPathDataByInputPath,
			unmappedInputPaths,
			reasons: unmappedInputPaths.map((inputPath) =>
				red(
					`Input path ${printPathOrGroPath(
						inputPath,
						pathsFromId(inputPath),
					)} cannot be mapped to a file or directory.`,
				),
			),
		};
	}

	// Find all of the files for any directories.
	timings.start('find files');
	const {
		sourceIdsByInputPath,
		inputDirectoriesWithNoFiles,
	} = await loadSourceIdsByInputPath(sourceIdPathDataByInputPath, (id) => findFiles(id));
	timings.stop('find files');

	// Error if any input path has no files. (means we have an empty directory)
	return inputDirectoriesWithNoFiles.length
		? {
				ok: false,
				type: 'inputDirectoriesWithNoFiles',
				sourceIdPathDataByInputPath,
				sourceIdsByInputPath,
				inputDirectoriesWithNoFiles,
				reasons: inputDirectoriesWithNoFiles.map((inputPath) =>
					red(
						`Input directory ${printPathOrGroPath(
							sourceIdPathDataByInputPath.get(inputPath)!.id,
							pathsFromId(inputPath),
						)} contains no matching files.`,
					),
				),
		  }
		: {ok: true, sourceIdsByInputPath, sourceIdPathDataByInputPath, timings};
};

/*

Load modules by source id.
This runs serially because importing test files requires
linking the current file with the module's initial execution.
TODO parallelize..how? Separate functions? `loadModulesSerially`?

*/
export const loadModules = async <ModuleType, ModuleMetaType extends ModuleMeta<ModuleType>>(
	sourceIdsByInputPath: Map<string, string[]>, // TODO maybe make this a flat array and remove `inputPath`?
	loadModuleById: (sourceId: string) => Promise<LoadModuleResult<ModuleMetaType>>,
): Promise<LoadModulesResult<ModuleMetaType>> => {
	const timings = new Timings<LoadModulesTimings>();
	timings.start('load modules');
	const modules: ModuleMetaType[] = [];
	const loadModuleFailures: LoadModuleFailure[] = [];
	const reasons: string[] = [];
	for (const [inputPath, sourceIds] of sourceIdsByInputPath) {
		for (const id of sourceIds) {
			const result = await loadModuleById(id);
			if (result.ok) {
				modules.push(result.mod);
			} else {
				loadModuleFailures.push(result);
				switch (result.type) {
					case 'importFailed': {
						reasons.push(
							red(
								`Module import ${printPath(id)} failed from input ${printPath(
									inputPath,
									pathsFromId(inputPath),
								)}: ${printError(result.error)}`,
							),
						);
						break;
					}
					case 'invalid': {
						reasons.push(red(`Module ${printPath(id)} failed validation '${result.validation}'.`));
						break;
					}
					default:
						throw new UnreachableError(result);
				}
			}
		}
	}
	timings.stop('load modules');

	return loadModuleFailures.length
		? {
				ok: false,
				type: 'loadModuleFailures',
				loadModuleFailures,
				reasons,
				modules,
				timings,
		  }
		: {ok: true, modules, timings};
};
