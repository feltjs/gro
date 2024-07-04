import type {Task} from '$lib/task.js';

export const task: Task = {
	summary: 'a test task for basic task behavior',
	run: ({log, args}) => {
		log.info('test task 1!', args);
		return args;
	},
};
