// handle uncaught errors
import {attach_process_error_handlers} from '../utils/process.js';
attach_process_error_handlers();

import mri from 'mri';

import type {Args} from '../task/task.js';
import {invoke_task} from '../task/invoke_task.js';
import {fs as nodeFs} from '../fs/node.js';

/*

This module invokes the Gro CLI which in turn invokes tasks.
Tasks are the CLI's primary concept.
To learn more about them, see the docs at `src/task/README.md`.

When the CLI is invoked it passes the first CLI arg as "task_name" to `invoke_task`.

*/
const main = async () => {
	const argv: Args = mri(process.argv.slice(2));

	// install sourcemaps
	if (process.env.NODE_ENV !== 'production') {
		const sourcemapSupport = await import('source-map-support');
		sourcemapSupport.install({
			handleUncaughtExceptions: false,
		});
	}

	const {
		_: [task_name, ..._],
		...namedArgs
	} = argv;
	const args = {_, ...namedArgs};

	await invoke_task(nodeFs, task_name, args);
};

main(); // see `attach_process_error_handlers` above for why we don't catch here
