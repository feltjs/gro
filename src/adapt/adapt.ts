import {toArray} from '@feltcoop/felt/util/array.js';
import {type Timings} from '@feltcoop/felt/util/timings.js';

import {type TaskContext} from '../task/task.js';
import {type GroConfig} from '../config/config.js';

/*

Adapting builds for production deployments is a concept borrowed from SvelteKit:
https://kit.svelte.dev/docs#adapters

The general idea is the same:
adapters are little plugins that take production builds as inputs and produce final outputs.

Despite the similarity, Gro's adapter API differs from SvelteKit's,
and interoperability is not a goal yet. (and may never be, can't tell right now)

*/

export interface Adapter<TArgs = any, TEvents = any> {
	name: string;
	adapt: (ctx: AdapterContext<TArgs, TEvents>) => void | Promise<void>;
}

export interface ToConfigAdapters<TArgs = any, TEvents = any> {
	(ctx: AdapterContext<TArgs, TEvents>):
		| (Adapter<TArgs, TEvents> | null | (Adapter<TArgs, TEvents> | null)[])
		| Promise<Adapter<TArgs, TEvents> | null | (Adapter<TArgs, TEvents> | null)[]>;
}

export interface AdapterContext<TArgs = any, TEvents = any> extends TaskContext<TArgs, TEvents> {
	config: GroConfig;
	timings: Timings;
}

export const adapt = async (ctx: AdapterContext): Promise<readonly Adapter[]> => {
	const {config, timings} = ctx;
	const timingToCreateAdapters = timings.start('create adapters');
	const adapters: Adapter<any, any>[] = toArray(await config.adapt(ctx)).filter(Boolean) as Adapter<
		any,
		any
	>[];
	timingToCreateAdapters();

	if (adapters.length) {
		const timingToRunAdapters = timings.start('adapt');
		for (const adapter of adapters) {
			if (!adapter.adapt) continue;
			const timing = timings.start(`adapt:${adapter.name}`);
			await adapter.adapt(ctx);
			timing();
		}
		timingToRunAdapters();
	}

	return adapters;
};
