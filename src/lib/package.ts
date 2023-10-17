import type {PackageJson} from './package_json.js';

export const package_json = {
	name: '@grogarden/gro',
	description: 'task runner and toolkit extending SvelteKit',
	version: '0.95.4',
	bin: {gro: 'dist/gro.js'},
	license: 'MIT',
	homepage: 'https://www.grogarden.org/',
	author: {name: 'Ryan Atkinson', email: 'mail@ryanatkn.com', url: 'https://www.ryanatkn.com/'},
	repository: {type: 'git', url: 'git+https://github.com/grogarden/gro.git'},
	bugs: {url: 'https://github.com/grogarden/gro/issues', email: 'mail@ryanatkn.com'},
	type: 'module',
	engines: {node: '>=20.7'},
	scripts: {
		build: 'rm -rf .gro dist && svelte-package && chmod +x ./dist/gro.js && npm link -f',
		start: 'gro dev',
		test: 'gro test',
	},
	keywords: [
		'web',
		'tools',
		'task runner',
		'tasks',
		'codegen',
		'svelte',
		'sveltekit',
		'vite',
		'typescript',
	],
	files: ['dist'],
	dependencies: {
		'@grogarden/util': '^0.15.0',
		'@ryanatkn/json-schema-to-typescript': '^11.1.5',
		chokidar: '^3.5.3',
		dotenv: '^16.3.1',
		'es-module-lexer': '^1.3.1',
		kleur: '^4.1.5',
		mri: '^1.2.0',
		prettier: '^3.0.3',
		'prettier-plugin-svelte': '^3.0.3',
		'tiny-glob': '^0.2.9',
		tslib: '^2.6.2',
		zod: '^3.22.4',
	},
	peerDependencies: {esbuild: '^0.18', svelte: '^4'},
	devDependencies: {
		'@changesets/changelog-git': '^0.1.14',
		'@changesets/types': '^5.2.1',
		'@feltjs/eslint-config': '^0.4.0',
		'@fuz.dev/fuz': '^0.72.1',
		'@fuz.dev/fuz_library': '^0.10.1',
		'@sveltejs/adapter-static': '^2.0.3',
		'@sveltejs/kit': '^1.25.2',
		'@sveltejs/package': '^2.2.2',
		'@types/fs-extra': '^11.0.2',
		'@types/node': '^20.8.6',
		'@typescript-eslint/eslint-plugin': '^6.7.5',
		'@typescript-eslint/parser': '^6.7.5',
		esbuild: '^0.18.0',
		eslint: '^8.51.0',
		'eslint-plugin-svelte': '^2.34.0',
		svelte: '^4.2.1',
		'svelte-check': '^3.5.2',
		typescript: '^5.2.2',
		uvu: '^0.5.6',
	},
	eslintConfig: {root: true, extends: '@feltjs', rules: {'no-console': 1}},
	prettier: {
		plugins: ['prettier-plugin-svelte'],
		useTabs: true,
		printWidth: 100,
		singleQuote: true,
		bracketSpacing: false,
		overrides: [{files: 'package.json', options: {useTabs: false}}],
	},
	exports: {
		'.': {default: './dist/index.js', types: './dist/index.d.ts'},
		'./args.js': {default: './dist/args.js', types: './dist/args.d.ts'},
		'./build.task.js': {default: './dist/build.task.js', types: './dist/build.task.d.ts'},
		'./changeset.task.js': {
			default: './dist/changeset.task.js',
			types: './dist/changeset.task.d.ts',
		},
		'./check.task.js': {default: './dist/check.task.js', types: './dist/check.task.d.ts'},
		'./clean_fs.js': {default: './dist/clean_fs.js', types: './dist/clean_fs.d.ts'},
		'./clean.task.js': {default: './dist/clean.task.js', types: './dist/clean.task.d.ts'},
		'./cli.js': {default: './dist/cli.js', types: './dist/cli.d.ts'},
		'./commit.task.js': {default: './dist/commit.task.js', types: './dist/commit.task.d.ts'},
		'./config.js': {default: './dist/config.js', types: './dist/config.d.ts'},
		'./deploy.task.js': {default: './dist/deploy.task.js', types: './dist/deploy.task.d.ts'},
		'./dev.task.js': {default: './dist/dev.task.js', types: './dist/dev.task.d.ts'},
		'./env.js': {default: './dist/env.js', types: './dist/env.d.ts'},
		'./esbuild_helpers.js': {
			default: './dist/esbuild_helpers.js',
			types: './dist/esbuild_helpers.d.ts',
		},
		'./esbuild_plugin_external_worker.js': {
			default: './dist/esbuild_plugin_external_worker.js',
			types: './dist/esbuild_plugin_external_worker.d.ts',
		},
		'./esbuild_plugin_svelte.js': {
			default: './dist/esbuild_plugin_svelte.js',
			types: './dist/esbuild_plugin_svelte.d.ts',
		},
		'./esbuild_plugin_sveltekit_local_imports.js': {
			default: './dist/esbuild_plugin_sveltekit_local_imports.js',
			types: './dist/esbuild_plugin_sveltekit_local_imports.d.ts',
		},
		'./esbuild_plugin_sveltekit_shim_alias.js': {
			default: './dist/esbuild_plugin_sveltekit_shim_alias.js',
			types: './dist/esbuild_plugin_sveltekit_shim_alias.d.ts',
		},
		'./esbuild_plugin_sveltekit_shim_app.js': {
			default: './dist/esbuild_plugin_sveltekit_shim_app.js',
			types: './dist/esbuild_plugin_sveltekit_shim_app.d.ts',
		},
		'./esbuild_plugin_sveltekit_shim_env.js': {
			default: './dist/esbuild_plugin_sveltekit_shim_env.js',
			types: './dist/esbuild_plugin_sveltekit_shim_env.d.ts',
		},
		'./exists.js': {default: './dist/exists.js', types: './dist/exists.d.ts'},
		'./format_directory.js': {
			default: './dist/format_directory.js',
			types: './dist/format_directory.d.ts',
		},
		'./format_file.js': {default: './dist/format_file.js', types: './dist/format_file.d.ts'},
		'./format.task.js': {default: './dist/format.task.js', types: './dist/format.task.d.ts'},
		'./gen_module.js': {default: './dist/gen_module.js', types: './dist/gen_module.d.ts'},
		'./gen_schemas.js': {default: './dist/gen_schemas.js', types: './dist/gen_schemas.d.ts'},
		'./gen.task.js': {default: './dist/gen.task.js', types: './dist/gen.task.d.ts'},
		'./gen.js': {default: './dist/gen.js', types: './dist/gen.d.ts'},
		'./git.js': {default: './dist/git.js', types: './dist/git.d.ts'},
		'./gro_plugin_gen.js': {
			default: './dist/gro_plugin_gen.js',
			types: './dist/gro_plugin_gen.d.ts',
		},
		'./gro_plugin_library.js': {
			default: './dist/gro_plugin_library.js',
			types: './dist/gro_plugin_library.d.ts',
		},
		'./gro_plugin_server.js': {
			default: './dist/gro_plugin_server.js',
			types: './dist/gro_plugin_server.d.ts',
		},
		'./gro_plugin_sveltekit_frontend.js': {
			default: './dist/gro_plugin_sveltekit_frontend.js',
			types: './dist/gro_plugin_sveltekit_frontend.d.ts',
		},
		'./gro.config.default.js': {
			default: './dist/gro.config.default.js',
			types: './dist/gro.config.default.d.ts',
		},
		'./gro.js': {default: './dist/gro.js', types: './dist/gro.d.ts'},
		'./hash.js': {default: './dist/hash.js', types: './dist/hash.d.ts'},
		'./input_path.js': {default: './dist/input_path.js', types: './dist/input_path.d.ts'},
		'./invoke_task.js': {default: './dist/invoke_task.js', types: './dist/invoke_task.d.ts'},
		'./invoke.js': {default: './dist/invoke.js', types: './dist/invoke.d.ts'},
		'./lint.task.js': {default: './dist/lint.task.js', types: './dist/lint.task.d.ts'},
		'./loader.js': {default: './dist/loader.js', types: './dist/loader.d.ts'},
		'./module.js': {default: './dist/module.js', types: './dist/module.d.ts'},
		'./modules.js': {default: './dist/modules.js', types: './dist/modules.d.ts'},
		'./package_json.js': {default: './dist/package_json.js', types: './dist/package_json.d.ts'},
		'./package.gen.js': {default: './dist/package.gen.js', types: './dist/package.gen.d.ts'},
		'./package.js': {default: './dist/package.js', types: './dist/package.d.ts'},
		'./path.js': {default: './dist/path.js', types: './dist/path.d.ts'},
		'./paths.js': {default: './dist/paths.js', types: './dist/paths.d.ts'},
		'./plugin.js': {default: './dist/plugin.js', types: './dist/plugin.d.ts'},
		'./print_task.js': {default: './dist/print_task.js', types: './dist/print_task.d.ts'},
		'./publish.task.js': {default: './dist/publish.task.js', types: './dist/publish.task.d.ts'},
		'./release.task.js': {default: './dist/release.task.js', types: './dist/release.task.d.ts'},
		'./resolve_specifier.js': {
			default: './dist/resolve_specifier.js',
			types: './dist/resolve_specifier.d.ts',
		},
		'./run_gen.js': {default: './dist/run_gen.js', types: './dist/run_gen.d.ts'},
		'./run_task.js': {default: './dist/run_task.js', types: './dist/run_task.d.ts'},
		'./schema.js': {default: './dist/schema.js', types: './dist/schema.d.ts'},
		'./search_fs.js': {default: './dist/search_fs.js', types: './dist/search_fs.d.ts'},
		'./sveltekit_config.js': {
			default: './dist/sveltekit_config.js',
			types: './dist/sveltekit_config.d.ts',
		},
		'./sveltekit_shim_app_environment.js': {
			default: './dist/sveltekit_shim_app_environment.js',
			types: './dist/sveltekit_shim_app_environment.d.ts',
		},
		'./sveltekit_shim_app_forms.js': {
			default: './dist/sveltekit_shim_app_forms.js',
			types: './dist/sveltekit_shim_app_forms.d.ts',
		},
		'./sveltekit_shim_app_navigation.js': {
			default: './dist/sveltekit_shim_app_navigation.js',
			types: './dist/sveltekit_shim_app_navigation.d.ts',
		},
		'./sveltekit_shim_app_paths.js': {
			default: './dist/sveltekit_shim_app_paths.js',
			types: './dist/sveltekit_shim_app_paths.d.ts',
		},
		'./sveltekit_shim_app_stores.js': {
			default: './dist/sveltekit_shim_app_stores.js',
			types: './dist/sveltekit_shim_app_stores.d.ts',
		},
		'./sveltekit_shim_app.js': {
			default: './dist/sveltekit_shim_app.js',
			types: './dist/sveltekit_shim_app.d.ts',
		},
		'./sveltekit_shim_env.js': {
			default: './dist/sveltekit_shim_env.js',
			types: './dist/sveltekit_shim_env.d.ts',
		},
		'./sync.task.js': {default: './dist/sync.task.js', types: './dist/sync.task.d.ts'},
		'./task_module.js': {default: './dist/task_module.js', types: './dist/task_module.d.ts'},
		'./task.js': {default: './dist/task.js', types: './dist/task.d.ts'},
		'./test.task.js': {default: './dist/test.task.js', types: './dist/test.task.d.ts'},
		'./throttle.js': {default: './dist/throttle.js', types: './dist/throttle.d.ts'},
		'./type_imports.js': {default: './dist/type_imports.js', types: './dist/type_imports.d.ts'},
		'./typecheck.task.js': {
			default: './dist/typecheck.task.js',
			types: './dist/typecheck.task.d.ts',
		},
		'./upgrade.task.js': {default: './dist/upgrade.task.js', types: './dist/upgrade.task.d.ts'},
		'./watch_dir.js': {default: './dist/watch_dir.js', types: './dist/watch_dir.d.ts'},
	},
} satisfies PackageJson;
