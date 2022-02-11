import {spawn} from '@feltcoop/felt/util/process.js';

import {type Task} from './task/task.js';

export const task: Task = {
	summary: 'alias for `gro` with no task name provided',
	run: async (): Promise<void> => {
		// TODO BLOCK
		await spawn('npx', ['gro']);
	},
};
