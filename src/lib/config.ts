import {paths} from './paths.js';
import create_default_config from './gro.config.default.js';
import type {CreateConfigPlugins} from './plugin.js';
import {exists} from './exists.js';
import type {MapPackageJson} from './package_json.js';

// TODO move the config to the root out of src/

/*

See `../docs/config.md` for documentation.

The Gro config tells Gro how to build and manage a project.
Dependent projects can optionally define one at `gro.config.ts`.
If none is provided, the fallback is located at `gro/src/lib/gro.config.default.ts`.

*/

export interface GroConfig {
	plugins: CreateConfigPlugins;
	/**
	 * Maps the project's `package.json`.
	 * The `pkg` argument may be mutated, but only the return value is used.
	 * Returning `null` is a no-op for that mode.
	 */
	package_json?: MapPackageJson;
	// TODO BLOCK maybe this should be named `public_package_json` for clarity?
	// TODO BLOCK should this be SvelteKit frontend plugin behavior?
	/**
	 * If truthy, adds `package.json` to the static directory of SvelteKit builds.
	 * If a function, maps the value.
	 */
	well_known_package_json?: boolean | MapPackageJson;
}

export interface CreateGroConfig {
	(base_config: GroConfig): GroConfig | Promise<GroConfig>;
}

export const create_empty_config = (): GroConfig => ({
	plugins: () => [],
	package_json: (pkg) => (pkg.private ? null : pkg),
	well_known_package_json: false,
});

export interface GroConfigModule {
	readonly default: GroConfig | CreateGroConfig;
}

export const load_config = async (): Promise<GroConfig> => {
	const default_config = await create_default_config(create_empty_config());

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
