import {BuildContext, Builder, BuildSource, noopBuilder} from './builder.js';
import {omitUndefined} from '../utils/object.js';
import {BuildConfig} from '../config/buildConfig.js';

export interface GetBuilder {
	(source: BuildSource, buildConfig: BuildConfig): Builder | null;
}
export interface GetBuilders {
	(): Builder[];
}
const getNoopBuilder: GetBuilder = () => noopBuilder;
const getNoopBuilders: GetBuilders = () => noopBuilders;
const noopBuilders: Builder[] = [noopBuilder];

export interface Options {
	getBuilder: GetBuilder;
	getBuilders: GetBuilders;
}
export type InitialOptions = Partial<Options>;
export const initOptions = (opts: InitialOptions): Options => {
	return {
		getBuilder: getNoopBuilder,
		getBuilders: getNoopBuilders,
		...omitUndefined(opts),
	};
};

// This `Lazy` builder proxies normal builder function calls,
// using a builder obtained from `getBuilder`,
// allowing user code to defer to the decision to the moment of action at runtime,
// which usually includes more useful contextual information.
// Because it proxies all calls, it implements all of `Builder`, hence `Required`.
export const createLazyBuilder = (opts: InitialOptions = {}): Required<Builder> => {
	const {getBuilder, getBuilders} = initOptions(opts);

	const build: Builder['build'] = (source, buildConfig, ctx) => {
		const builder = getBuilder(source, buildConfig) || noopBuilder;
		return builder.build(source, buildConfig, ctx);
	};

	const onRemove: Builder['onRemove'] = async (
		source: BuildSource,
		buildConfig: BuildConfig,
		ctx: BuildContext,
	) => {
		const builder = getBuilder(source, buildConfig) || noopBuilder;
		if (builder.onRemove === undefined) return;
		await builder.onRemove(source, buildConfig, ctx);
	};

	const init: Builder['init'] = async (ctx: BuildContext, buildConfigs: readonly BuildConfig[]) => {
		for (const builder of getBuilders()) {
			if (builder.init === undefined) continue;
			await builder.init(ctx, buildConfigs);
		}
	};

	return {build, onRemove, init};
};
