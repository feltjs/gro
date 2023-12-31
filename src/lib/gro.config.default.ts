import type {Create_Gro_Config} from './config.js';
import {has_sveltekit_library} from './gro_plugin_sveltekit_library.js';
import {has_server} from './gro_plugin_server.js';
import {has_sveltekit_app} from './gro_plugin_sveltekit_app.js';

/**
 * This is the default config that's passed to `gro.config.ts`
 * if it exists in the current project, and if not, this is the final config.
 * It looks at the project and tries to do the right thing:
 *
 * - if `src/routes`, assumes a SvelteKit frontend
 * - if `src/lib`, assumes a Node library
 * - if `src/lib/server/server.ts`, assumes a Node  server
 */
const config: Create_Gro_Config = async (cfg) => {
	const [enable_library, enable_server, enable_sveltekit_frontend] = await Promise.all([
		has_sveltekit_library(),
		has_server(),
		has_sveltekit_app(),
	]);

	cfg.plugins = async () => [
		enable_library ? (await import('./gro_plugin_sveltekit_library.js')).plugin() : null,
		enable_server ? (await import('./gro_plugin_server.js')).plugin() : null,
		enable_sveltekit_frontend
			? (await import('./gro_plugin_sveltekit_app.js')).plugin({
					host_target: enable_server ? 'node' : 'github_pages',
				})
			: null,
		// TODO replace with an esbuild plugin, see the module for more
		// (await import('./gro_plugin_gen.js')).plugin(),
	];

	return cfg;
};

export default config;
