import type {Config} from '@sveltejs/kit';
import type {CompileOptions, PreprocessorGroup} from 'svelte/compiler';
import {join} from 'node:path';
import {cwd} from 'node:process';

import {SVELTEKIT_CONFIG_FILENAME} from './paths.js';

/**
 * Loads a SvelteKit config at `dir`.
 * @returns
 */
export const load_sveltekit_config = async (dir: string = cwd()): Promise<Config | null> => {
	try {
		return (await import(join(dir, SVELTEKIT_CONFIG_FILENAME))).default;
	} catch (err) {
		return null;
	}
};

/**
 * A subset of SvelteKit's config in a form that Gro uses
 * because SvelteKit doesn't expose its config resolver.
 * Flattens things out to keep them simple and easy to pass around,
 * and doesn't deal with most properties.
 * The `base` and `assets` in particular are renamed for clarity with Gro's internal systems,
 * so these properties become first-class vocabulary inside Gro.
 */
export interface Parsed_Sveltekit_Config {
	// TODO probably fill these out with defaults
	sveltekit_config: Config | null;
	alias: Record<string, string> | undefined;
	base_url: '' | `/${string}` | undefined;
	assets_url: '' | `http://${string}` | `https://${string}` | undefined;

	// TODO others, but maybe replace with a Zod schema? https://kit.svelte.dev/docs/configuration
	assets_path: string;
	lib_path: string;
	routes_path: string;

	env_dir: string | undefined;
	private_prefix: string | undefined;
	public_prefix: string | undefined;
	svelte_compile_options: CompileOptions | undefined;
	svelte_preprocessors: PreprocessorGroup | PreprocessorGroup[] | undefined;
}

/**
 * Returns Gro-relevant properties of a SvelteKit config
 * as a convenience wrapper around `load_sveltekit_config`.
 * Needed because SvelteKit doesn't expose its config resolver.
 */
export const init_sveltekit_config = async (
	dir_or_config: string | Config = cwd(),
): Promise<Parsed_Sveltekit_Config> => {
	const sveltekit_config =
		typeof dir_or_config === 'string' ? await load_sveltekit_config(dir_or_config) : dir_or_config;
	const kit = sveltekit_config?.kit;

	const alias = kit?.alias;

	const base_url = kit?.paths?.base;
	const assets_url = kit?.paths?.assets;

	// TODO probably a Zod schema instead
	const assets_path = kit?.files?.assets ?? 'static';
	const lib_path = kit?.files?.lib ?? 'src/lib';
	const routes_path = kit?.files?.routes ?? 'src/routes';

	const env_dir = kit?.env?.dir;
	const private_prefix = kit?.env?.privatePrefix;
	const public_prefix = kit?.env?.publicPrefix;

	const svelte_compile_options = sveltekit_config?.compilerOptions;
	const svelte_preprocessors = sveltekit_config?.preprocess;

	return {
		sveltekit_config,
		alias,
		base_url,
		assets_url,
		assets_path,
		lib_path,
		routes_path,
		env_dir,
		private_prefix,
		public_prefix,
		svelte_compile_options,
		svelte_preprocessors,
	};
};
