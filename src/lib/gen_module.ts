import type {Timings} from '@ryanatkn/belt/timings.js';
import type {Result} from '@ryanatkn/belt/result.js';
import {red} from 'kleur/colors';

import {type Module_Meta, load_modules, type Load_Module_Failure} from './modules.js';
import type {Gen} from './gen.js';
import {
	Input_Path,
	resolve_input_files,
	resolve_input_paths,
	type Resolved_Input_File,
	type Resolved_Input_Path,
} from './input_path.js';
import {paths, print_path} from './paths.js';
import {search_fs} from './search_fs.js';

export const GEN_FILE_PATTERN_TEXT = 'gen';
export const GEN_FILE_PATTERN = '.' + GEN_FILE_PATTERN_TEXT + '.';

export const is_gen_path = (path: string): boolean => path.includes(GEN_FILE_PATTERN);

export interface Found_Genfiles {
	resolved_input_files: Resolved_Input_File[];
	resolved_input_files_by_input_path: Map<Input_Path, Resolved_Input_File[]>;
	resolved_input_paths: Resolved_Input_Path[];
	resolved_input_path_by_input_path: Map<Input_Path, Resolved_Input_Path>;
}

export type Find_Genfiles_Result = Result<{value: Found_Genfiles}, Find_Genfiles_Failure>;
export type Find_Genfiles_Failure =
	| {
			type: 'unmapped_input_paths';
			unmapped_input_paths: Input_Path[];
			resolved_input_paths: Resolved_Input_Path[];
			resolved_input_path_by_input_path: Map<Input_Path, Resolved_Input_Path>;
			reasons: string[];
	  }
	| {
			type: 'input_directories_with_no_files';
			input_directories_with_no_files: Resolved_Input_Path[];
			resolved_input_files: Resolved_Input_File[];
			resolved_input_files_by_input_path: Map<Input_Path, Resolved_Input_File[]>;
			resolved_input_paths: Resolved_Input_Path[];
			resolved_input_path_by_input_path: Map<Input_Path, Resolved_Input_Path>;
			reasons: string[];
	  };

/**
 * Finds modules from input paths. (see `src/lib/input_path.ts` for more)
 */
export const find_genfiles = async (
	input_paths: Input_Path[] = [paths.source],
	timings?: Timings,
): Promise<Find_Genfiles_Result> => {
	const extensions: string[] = [GEN_FILE_PATTERN];
	const root_dirs: string[] = [];

	// Check which extension variation works - if it's a directory, prefer others first!
	const timing_to_resolve_input_paths = timings?.start('resolve input paths');
	const {resolved_input_paths, unmapped_input_paths} = await resolve_input_paths(
		input_paths,
		root_dirs,
		extensions,
	);
	console.log('[find_modules]', resolved_input_paths);
	timing_to_resolve_input_paths?.();

	const resolved_input_path_by_input_path = new Map(
		resolved_input_paths.map((r) => [r.input_path, r]),
	);

	// Error if any input path could not be mapped.
	if (unmapped_input_paths.length) {
		return {
			ok: false,
			type: 'unmapped_input_paths',
			unmapped_input_paths,
			resolved_input_paths,
			resolved_input_path_by_input_path,
			reasons: unmapped_input_paths.map((input_path) =>
				red(`Input path ${print_path(input_path)} cannot be mapped to a file or directory.`),
			),
		};
	}

	// Find all of the files for any directories.
	const timing_to_search_fs = timings?.start('find files');
	const {
		resolved_input_files,
		resolved_input_files_by_input_path,
		input_directories_with_no_files,
	} = await resolve_input_files(resolved_input_paths, (id) =>
		search_fs(id, {filter: (path) => extensions.some((e) => path.includes(e))}),
	);
	timing_to_search_fs?.();

	// Error if any input path has no files. (means we have an empty directory)
	if (input_directories_with_no_files.length) {
		return {
			ok: false,
			type: 'input_directories_with_no_files',
			input_directories_with_no_files,
			resolved_input_files,
			resolved_input_files_by_input_path,
			resolved_input_paths,
			resolved_input_path_by_input_path,
			reasons: input_directories_with_no_files.map(({input_path}) =>
				red(
					`Input directory ${print_path(
						resolved_input_path_by_input_path.get(input_path)!.id,
					)} contains no matching files.`,
				),
			),
		};
	}

	return {
		ok: true,
		value: {
			resolved_input_files,
			resolved_input_files_by_input_path,
			resolved_input_paths,
			resolved_input_path_by_input_path,
		},
	};
};

// TODO BLOCK this and other `Gen_` to `Genfile_`?
export interface Genfile_Module {
	gen: Gen;
}

export type Genfile_Module_Meta = Module_Meta<Genfile_Module>;

export interface Loaded_Genfiles {
	modules: Genfile_Module_Meta[];
	found_genfiles: Found_Genfiles;
}

// TODO BLOCK messy with Load_Modules equivalents, extend the parts of `Load_Modules_Result` to dry ths up and just pass the Genfile_Module_Meta param, same as in task module
export type Load_Genfiles_Result = Result<{value: Loaded_Genfiles}, Load_Genfiles_Failure>;
export type Load_Genfiles_Failure = {
	type: 'load_module_failures';
	load_module_failures: Load_Module_Failure[];
	reasons: string[];
	// still return the modules and timings, deferring to the caller
	modules: Genfile_Module_Meta[];
};

export const load_genfiles = async (
	found_genfiles: Found_Genfiles,
	timings?: Timings,
): Promise<Load_Genfiles_Result> => {
	// TODO BLOCK refactor
	const loaded_modules = await load_modules(
		found_genfiles.resolved_input_files,
		validate_gen_module,
		(id, mod): Genfile_Module_Meta => ({id, mod}),
		timings,
	);
	if (!loaded_modules.ok) {
		return loaded_modules;
	}
	return {
		ok: true,
		value: {modules: loaded_modules.modules, found_genfiles},
	};
};

export const validate_gen_module = (mod: Record<string, any>): mod is Genfile_Module =>
	typeof mod?.gen === 'function';
