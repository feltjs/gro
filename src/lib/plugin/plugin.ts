import {toArray} from '@feltjs/util/array.js';
import type {Timings} from '@feltjs/util/timings.js';

import type {TaskContext} from '../task/task.js';
import type {GroConfig} from '../config/config.js';
import type {Filer} from '../build/Filer.js';

/*

Gro `Plugin`s enable custom behavior during `gro dev` and `gro build`.
In contrast, `Adapter`s use the results of `gro build` to produce final artifacts.

*/

export interface Plugin<TPluginContext extends PluginContext = PluginContext> {
	name: string;
	setup?: (ctx: TPluginContext) => void | Promise<void>;
	teardown?: (ctx: TPluginContext) => void | Promise<void>;
}

export interface ToConfigPlugins<TPluginContext extends PluginContext = PluginContext> {
	(
		ctx: TPluginContext,
	):
		| (Plugin<TPluginContext> | null | Array<Plugin<TPluginContext> | null>)
		| Promise<Plugin<TPluginContext> | null | Array<Plugin<TPluginContext> | null>>;
}

export interface PluginContext<TArgs = any, TEvents = any> extends TaskContext<TArgs, TEvents> {
	config: GroConfig;
	/**
	 * `filer` is `null` for production builds, but it's not clear if that's good design.
	 */
	filer: Filer | null;
	timings: Timings;
}

export class Plugins<TPluginContext extends PluginContext> {
	/* prefer `Plugins.create` to the constructor */
	constructor(
		private readonly ctx: TPluginContext,
		private readonly instances: readonly Plugin[],
	) {}

	static async create<TPluginContext extends PluginContext>(
		ctx: TPluginContext,
	): Promise<Plugins<TPluginContext>> {
		const {timings} = ctx;
		const timingToCreate = timings.start('plugins.create');
		const instances: Plugin[] = toArray(await ctx.config.plugin(ctx)).filter(Boolean) as any;
		const plugins = new Plugins(ctx, instances);
		timingToCreate();
		return plugins;
	}

	async setup(): Promise<void> {
		const {ctx, instances} = this;
		if (!this.instances.length) return;
		const {timings, log} = ctx;
		const timingToSetup = timings.start('plugins.setup');
		for (const plugin of instances) {
			if (!plugin.setup) continue;
			log.debug('setup plugin', plugin.name);
			const timing = timings.start(`setup:${plugin.name}`);
			await plugin.setup(ctx); // eslint-disable-line no-await-in-loop
			timing();
		}
		timingToSetup();
	}

	async teardown(): Promise<void> {
		const {ctx, instances} = this;
		if (!this.instances.length) return;
		const {timings, log} = ctx;
		const timingToTeardown = timings.start('plugins.teardown');
		for (const plugin of instances) {
			if (!plugin.teardown) continue;
			log.debug('teardown plugin', plugin.name);
			const timing = timings.start(`teardown:${plugin.name}`);
			await plugin.teardown(ctx); // eslint-disable-line no-await-in-loop
			timing();
		}
		timingToTeardown();
	}
}
