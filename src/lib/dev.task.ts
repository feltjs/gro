import {printTimings} from '@feltjs/util/print.js';
import {Timings} from '@feltjs/util/timings.js';
import {z} from 'zod';

import type {Task} from './task/task.js';
import {load_config} from './config/config.js';
import {Plugins, type PluginContext} from './plugin/plugin.js';

export const Args = z
	.object({
		watch: z.boolean({description: 'read this instead of no-watch'}).default(true),
		'no-watch': z
			.boolean({
				description:
					'opt out of running a long-lived process to watch files and rebuild on changes',
			})
			.optional() // TODO behavior differs now with zod, because of `default` this does nothing
			.default(false),
	})
	.strict();
export type Args = z.infer<typeof Args>;

export type DevTaskContext = PluginContext<Args>;

export const task: Task<Args> = {
	summary: 'start SvelteKit and other dev plugins',
	Args,
	run: async (ctx) => {
		const {log, args, invoke_task} = ctx;
		const {watch} = args;

		const timings = new Timings();

		// TODO BLOCK
		// await invoke_task('gen');

		const timing_to_load_config = timings.start('load config');
		const config = await load_config();
		timing_to_load_config();

		const dev_task_context: DevTaskContext = {...ctx, config, dev: true, timings};

		console.log('CREATING PLUGINS');
		const plugins = await Plugins.create(dev_task_context);

		console.log('SETTING UP PLUGINS');
		await plugins.setup();

		if (!watch) {
			await plugins.teardown(); // maybe detect process exit and teardown
		}

		printTimings(timings, log);
	},
};
