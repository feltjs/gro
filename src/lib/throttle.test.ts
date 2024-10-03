import {wait} from '@ryanatkn/belt/async.js';
import {test} from 'uvu';
import * as assert from 'uvu/assert';

import {throttle} from './throttle.js';

test('throttles calls to a function', async () => {
	const results: string[] = [];
	const fn = throttle(async (name: string) => {
		results.push(name + '_run');
		await wait();
		results.push(name + '_done');
	}, 0);
	const promise_a = fn('a');
	const promise_b = fn('b'); // discarded
	const promise_c = fn('c'); // discarded
	const promise_d = fn('d');

	assert.ok(promise_a !== promise_b);
	assert.is(promise_b, promise_c);
	assert.is(promise_b, promise_d);
	assert.equal(results, ['a_run']);

	// await promise_a;

	// assert.equal(results, ['a_run', 'a_done']);

	await promise_b;

	assert.equal(results, ['a_run', 'a_done', 'd_run', 'd_done']);

	const promise_e = fn('e'); // discarded
	const promise_f = fn('f');

	assert.ok(promise_d !== promise_e);
	assert.is(promise_e, promise_f);
	assert.equal(results, ['a_run', 'a_done', 'd_run', 'd_done']); // delayed

	await wait();

	assert.equal(results, ['a_run', 'a_done', 'd_run', 'd_done', 'f_run']);

	await promise_e;

	assert.equal(results, ['a_run', 'a_done', 'd_run', 'd_done', 'f_run', 'f_done']);

	const promise_g = fn('g');

	assert.equal(results, ['a_run', 'a_done', 'd_run', 'd_done', 'f_run', 'f_done']); // delayed

	await wait();

	assert.equal(results, ['a_run', 'a_done', 'd_run', 'd_done', 'f_run', 'f_done', 'g_run']);

	await promise_g;

	assert.equal(results, [
		'a_run',
		'a_done',
		'd_run',
		'd_done',
		'f_run',
		'f_done',
		'g_run',
		'g_done',
	]);
});

test.only('throttles calls to a function with leading = false', async () => {
	console.log('\n\n\nTEST 2\n\n');
	const results: string[] = [];
	const fn = throttle(
		async (name: string) => {
			results.push(name + '_run');
			await wait();
			results.push(name + '_done');
		},
		0,
		false,
	);

	const promise_a = fn('a'); // discarded
	const promise_b = fn('b'); // discarded
	const promise_c = fn('c'); // discarded
	const promise_d = fn('d');

	assert.is(promise_a, promise_b);
	assert.is(promise_a, promise_c);
	assert.is(promise_a, promise_d);
	assert.equal(results, []); // No immediate execution

	// await wait(); // Wait for the delay

	// assert.equal(results, ['d_run']);

	console.log(`promise_a`, promise_a);
	await promise_a; // All promises resolve to the same result

	assert.equal(results, ['d_run', 'd_done']);

	const promise_e = fn('e');
	assert.ok(promise_a !== promise_e);
	assert.equal(results, ['d_run', 'd_done']); // Delayed execution

	await wait(); // Wait for the delay

	assert.equal(results, ['d_run', 'd_done', 'e_run']);

	await promise_e;

	assert.equal(results, ['d_run', 'd_done', 'e_run', 'e_done']);
});

test.run();
