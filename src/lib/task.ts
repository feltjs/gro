import type {Logger} from '@ryanatkn/belt/log.js';
import {strip_end, strip_start} from '@ryanatkn/belt/string.js';
import type {z} from 'zod';
import type {Timings} from '@ryanatkn/belt/timings.js';

import type {Args} from './args.js';
import type {Path_Id} from './path.js';
import type {Gro_Config} from './config.js';
import type {Parsed_Sveltekit_Config} from './sveltekit_config.js';

export interface Task<
	T_Args = Args, // same as `z.infer<typeof Args>`
	T_Args_Schema extends z.ZodType = z.ZodType,
	T_Return = unknown,
> {
	run: (ctx: Task_Context<T_Args>) => Promise<T_Return>; // TODO return value (make generic, forward it..how?)
	summary?: string;
	Args?: T_Args_Schema;
}

export interface Task_Context<T_Args = object> {
	args: T_Args;
	config: Gro_Config;
	sveltekit_config: Parsed_Sveltekit_Config;
	// TODO should this go here or on `config` for convenience?
	// sveltekit_config: Parsed_Sveltekit_Config;
	log: Logger;
	timings: Timings;
	invoke_task: (task_name: string, args?: Args, config?: Gro_Config) => Promise<void>;
}

export const TASK_FILE_SUFFIX_TS = '.task.ts';
export const TASK_FILE_SUFFIX_JS = '.task.js';
export const TASK_FILE_SUFFIXES = [TASK_FILE_SUFFIX_TS, TASK_FILE_SUFFIX_JS]; // TODO from `Gro_Config`, but needs to be used everywhere the constants are

export const is_task_path = (path: string): boolean =>
	path.endsWith(TASK_FILE_SUFFIX_TS) || path.endsWith(TASK_FILE_SUFFIX_JS);

// TODO BLOCK refactor or remove this, is a hack because the `task_root_path` should be known
export const to_task_name = (id: Path_Id, task_root_paths: Path_Id[]): string => {
	// If the id is in any of the task root paths, use the longest available match and strip it.
	// This is convoluted because we're not tracking which root path was resolved against the id.
	// TODO improve the data flow of id from task root path so this is unnecessary
	let longest_matching_path = '';
	for (const path of task_root_paths) {
		if (id.startsWith(path) && path.length > longest_matching_path.length) {
			longest_matching_path = path;
		}
	}
	const task_name = longest_matching_path
		? strip_start(strip_start(id, longest_matching_path), '/')
		: id;
	return strip_end(strip_end(task_name, TASK_FILE_SUFFIX_TS), TASK_FILE_SUFFIX_JS);
};

/**
 * This is used by tasks to signal a known failure.
 * It's useful for cleaning up logging because
 * we usually don't need their stack trace.
 */
export class Task_Error extends Error {}
