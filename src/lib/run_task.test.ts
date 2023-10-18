import {test} from 'uvu';
import * as assert from 'uvu/assert';
import {Timings} from '@grogarden/util/timings.js';

import {run_task} from './run_task.js';
import {load_config} from './config.js';

test('passes args and returns output', async () => {
	const args = {a: 1, _: []};
	const result = await run_task(
		{
			name: 'testTask',
			id: 'foo/testTask',
			mod: {
				task: {
					run: ({args}) => Promise.resolve(args),
				},
			},
		},
		args,
		() => Promise.resolve(),
		await load_config(),
		new Timings(),
	);
	assert.ok(result.ok);
	assert.is(result.output, args);
});

test('invokes a sub task', async () => {
	const args = {a: 1, _: []};
	let invoked_task_name;
	let invoked_args;
	const result = await run_task(
		{
			name: 'testTask',
			id: 'foo/testTask',
			mod: {
				task: {
					run: async ({args, invoke_task}) => {
						await invoke_task('bar/testTask', args);
						return args;
					},
				},
			},
		},
		args,
		async (invokingTaskName, invokingArgs) => {
			invoked_task_name = invokingTaskName;
			invoked_args = invokingArgs;
		},
		await load_config(),
		new Timings(),
	);
	assert.ok(result.ok);
	assert.is(invoked_task_name, 'bar/testTask');
	assert.is(invoked_args, args);
	assert.is(result.output, args);
});

test('failing task', async () => {
	let err;
	const result = await run_task(
		{
			name: 'testTask',
			id: 'foo/testTask',
			mod: {
				task: {
					run: async () => {
						err = Error();
						throw err;
					},
				},
			},
		},
		{_: []},
		async () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
		await load_config(),
		new Timings(),
	);
	assert.ok(!result.ok);
	assert.ok(result.reason);
	assert.is(result.error, err);
});

test.run();
