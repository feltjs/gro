import {print_spawn_result} from '@grogarden/util/process.js';
import {z} from 'zod';

import {TaskError, type Task} from './task.js';
import {print_command_args, serialize_args, to_forwarded_args} from './args.js';
import {find_cli, spawn_cli} from './cli.js';
import {sveltekit_sync} from './sync.task.js';

export const Args = z.object({}).strict();
export type Args = z.infer<typeof Args>;

export const task: Task<Args> = {
	summary: 'run tsc on the project without emitting any files',
	Args,
	run: async ({log}): Promise<void> => {
		await sveltekit_sync();

		if (await find_cli('svelte-check')) {
			// svelte-check
			const serialized = serialize_args(to_forwarded_args('svelte-check'));
			log.info(print_command_args(['svelte-check'].concat(serialized)));
			const svelteCheckResult = await spawn_cli('svelte-check', serialized);
			if (!svelteCheckResult?.ok) {
				throw new TaskError(`Failed to typecheck. ${print_spawn_result(svelteCheckResult!)}`);
			}
		} else if (await find_cli('tsc')) {
			// tsc
			const forwarded = to_forwarded_args('tsc');
			if (!forwarded.noEmit) forwarded.noEmit = true;
			const serialized = serialize_args(forwarded);
			log.info(print_command_args(['tsc'].concat(serialized)));
			const svelteCheckResult = await spawn_cli('tsc', serialized);
			if (!svelteCheckResult?.ok) {
				throw new TaskError(`Failed to typecheck. ${print_spawn_result(svelteCheckResult!)}`);
			}
		} else {
			throw new TaskError(`Failed to typecheck because neither tsc nor svelte-check was found`);
		}
	},
};
