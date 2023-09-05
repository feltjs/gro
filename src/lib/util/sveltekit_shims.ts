import {load_env} from './env.js';

// TODO might want to do more escaping and validation

/**
 * Generates a module shim for SvelteKit's `$env` imports.
 */
export const render_env_shim_module = (
	dev: boolean,
	mode: 'static' | 'dynamic',
	visibility: 'public' | 'private',
	public_prefix: string,
	private_prefix: string,
	env_dir?: string,
	env_files?: string[],
	ambient_env?: Record<string, string | undefined>,
): string => {
	const env = load_env(
		dev,
		visibility,
		public_prefix,
		private_prefix,
		env_dir,
		env_files,
		ambient_env,
	);
	if (mode === 'static') {
		return `// shim for $env/${mode}/${visibility}
// @see https://github.com/sveltejs/kit/issues/1485
${Object.entries(env)
	.map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
	.join('\n')}
		`;
	} else {
		return `// shim for $env/${mode}/${visibility}
// @see https://github.com/sveltejs/kit/issues/1485
import {load_env} from '@feltjs/gro/util/env.js';
const env = load_env(${dev}, ${JSON.stringify(visibility)}, ${JSON.stringify(
			public_prefix,
		)}, ${JSON.stringify(private_prefix)}, ${JSON.stringify(env_dir)}, ${JSON.stringify(
			env_files,
		)}, ${JSON.stringify(ambient_env)});
${Object.keys(env)
	.map((k) => `export const ${k} = env.${k};`)
	.join('\n')}
		`;
	}
};
