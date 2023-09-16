import {paths} from '../util/paths.js';
import type {ToConfigAdapters} from '../adapt/adapt.js';
import create_default_config from './gro.config.default.js';
import type {ToConfigPlugins} from '../plugin/plugin.js';
import {exists} from '../util/exists.js';

/*

See `../docs/config.md` for documentation.

The Gro config tells Gro how to build and manage a project.
Dependent projects can optionally define one at `src/gro.config.ts`.
If none is provided, the fallback is located at `gro/src/lib/config/gro.config.default.ts`.

The prevailing pattern in web development is to put config files like this in the root directory,
but Gro opts to put it in `src/`.
This choice keeps things simple and flexible because:

- a project's Gro config may share any amount of code and types bidirectionally
	with the project's source code
- the config itself is defined in TypeScript
- isolating all buildable source code in `src/` avoids a lot of tooling complexity

*/

export interface GroConfig {
	readonly plugin: ToConfigPlugins;
	readonly adapt: ToConfigAdapters;
}

export interface GroConfigCreator {
	(default_config: GroConfig): GroConfig | Promise<GroConfig>;
}

export interface GroConfigModule {
	readonly default: GroConfig | GroConfigCreator;
}

let cached_config: Promise<GroConfig> | undefined;

export const load_config = (): Promise<GroConfig> =>
	cached_config || (cached_config = _load_config());

const _load_config = async (): Promise<GroConfig> => {
	const default_config = await create_default_config({} as any); // hacky so the default config demonstrates the same code a user would write

	const config_path = paths.config;
	let config: GroConfig;
	if (await exists(config_path)) {
		const config_module = await import(config_path);
		validate_config_module(config_module, config_path);
		config =
			typeof config_module.default === 'function'
				? await config_module.default(default_config)
				: config_module.default;
	} else {
		config = default_config;
	}
	return config;
};

export const validate_config_module: (
	config_module: any,
	config_path: string,
) => asserts config_module is GroConfigModule = (config_module, config_path) => {
	const config = config_module.default;
	if (!config) {
		throw Error(`Invalid Gro config module at ${config_path}: expected a default export`);
	} else if (!(typeof config === 'function' || typeof config === 'object')) {
		throw Error(
			`Invalid Gro config module at ${config_path}: the default export must be a function or object`,
		);
	}
};
