import type StrictEventEmitter from 'strict-event-emitter-types';
import type {EventEmitter} from 'events';
import type {Logger} from '@feltcoop/util/log.js';
import {stripEnd} from '@feltcoop/util/string.js';
import type {z} from 'zod';

import type {Filesystem} from '../fs/filesystem.js';
import type {Args} from '../utils/args.js';

export interface Task<
	TArgs = Args,
	TEvents = object,
	TArgsSchema extends z.ZodType<any, z.ZodTypeDef, any> = z.ZodType<any, z.ZodTypeDef, any>,
> {
	run: (ctx: TaskContext<TArgs, TEvents>) => Promise<unknown>; // TODO return value (make generic, forward it..how?)
	summary?: string;
	production?: boolean;
	Args?: TArgsSchema;
}

export interface TaskContext<TArgs = object, TEvents = object> {
	fs: Filesystem;
	dev: boolean;
	log: Logger;
	args: TArgs;
	events: StrictEventEmitter<EventEmitter, TEvents>;
	invokeTask: (
		taskName: string,
		args?: object,
		events?: StrictEventEmitter<EventEmitter, TEvents>,
		fs?: Filesystem,
	) => Promise<void>;
}

export const TASK_FILE_SUFFIX = '.task.ts';

export const isTaskPath = (path: string): boolean => path.endsWith(TASK_FILE_SUFFIX);

export const toTaskName = (basePath: string): string => {
	const stripped = stripEnd(basePath, TASK_FILE_SUFFIX);
	if (stripped === basePath) return basePath;
	// Handle task directories, so `a/a.task` outputs `a` instead of `a/a`.
	const s = stripped.split('/');
	return s.at(-1) === s.at(-2) ? s.slice(0, -1).join('/') : stripped;
};

// This is used by tasks to signal a known failure.
// It's useful for cleaning up logging because
// we usually don't need their stack trace.
export class TaskError extends Error {}
