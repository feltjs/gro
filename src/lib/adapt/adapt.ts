import {toArray} from '@feltjs/util/array.js';
import type {Timings} from '@feltjs/util/timings.js';

import type {TaskContext} from '../task/task.js';
import type {GroConfig} from '../config/config.js';

/*

Adapting builds for production deployments is a concept borrowed from SvelteKit:
https://kit.svelte.dev/docs#adapters

The general idea is the same:
adapters are little plugins that take production builds as inputs and produce final outputs.

The goal is to remove all of this from Gro: see https://github.com/feltjs/gro/issues/329

*/

export interface Adapter<TArgs = any> {
	name: string;
	adapt: (ctx: AdapterContext<TArgs>) => void | Promise<void>;
}

export interface ToConfigAdapters<TArgs = any> {
	(
		ctx: AdapterContext<TArgs>,
	):
		| (Adapter<TArgs> | null | Array<Adapter<TArgs> | null>)
		| Promise<Adapter<TArgs> | null | Array<Adapter<TArgs> | null>>;
}

export interface AdapterContext<TArgs = any> extends TaskContext<TArgs> {
	config: GroConfig;
	dev: boolean;
	timings: Timings;
}

export const adapt = async (ctx: AdapterContext): Promise<readonly Adapter[]> => {
	const {config, timings} = ctx;
	const timing_to_create_adapters = timings.start('create adapters');
	const adapters: Array<Adapter<any>> = toArray(await config.adapt(ctx)).filter(Boolean) as Array<
		Adapter<any>
	>;
	timing_to_create_adapters();

	if (adapters.length) {
		const timing_to_run_adapters = timings.start('adapt');
		for (const adapter of adapters) {
			if (!adapter.adapt) continue;
			const timing = timings.start(`adapt:${adapter.name}`);
			await adapter.adapt(ctx); // eslint-disable-line no-await-in-loop
			timing();
		}
		timing_to_run_adapters();
	}

	return adapters;
};
