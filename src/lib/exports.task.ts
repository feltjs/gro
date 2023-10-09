import {z} from 'zod';
import {plural, strip_end} from '@grogarden/util/string.js';
import {mkdir, readFile, writeFile} from 'node:fs/promises';

import {TaskError, type Task} from './task.js';
import {search_fs} from './search_fs.js';
import {paths} from './paths.js';
import {
	load_package_json,
	serialize_package_json,
	to_package_exports,
	update_package_json,
	normalize_package_json,
} from './package_json.js';
import {load_sveltekit_config} from './sveltekit_config.js';
import {exists} from './exists.js';

export const Args = z
	.object({
		dir: z.string({description: 'directory to find files'}).default(paths.lib),
		include: z.string({description: 'regexp to match'}).default(''),
		exclude: z
			.string({description: 'regexp to not match'})
			.default('(\\.md|\\.(gen|test|ignore)\\.|\\/(test|fixtures|ignore)\\/)'),
		check: z.boolean({description: 'exit with a nonzero code if exports changed'}).default(false),
	})
	.strict();
export type Args = z.infer<typeof Args>;

// TODO BLOCK is `exports` the right name for this?

// TODO this is no longer a good name, either rename or factor out the .well-known stuff
// maybe `gro package`?
export const task: Task<Args> = {
	summary: 'write the "exports" property of package.json and copy the file to .well-known',
	Args,
	run: async ({args: {dir, include, exclude, check}, config, log}): Promise<void> => {
		const {package_json, well_known_package_json} = config;

		// map `package.json`
		const exported_files = await search_fs(dir, {filter: create_exports_filter(include, exclude)});
		const exported_paths = Array.from(exported_files.keys());
		const exports = to_package_exports(exported_paths);
		const exports_count = Object.keys(exports).length;
		const changed_exports = await update_package_json(async (pkg) => {
			pkg.exports = exports;
			const mapped = package_json ? await package_json(pkg) : pkg;
			return mapped ? normalize_package_json(mapped) : mapped;
		}, !check);

		if (check) {
			if (changed_exports) {
				throw new TaskError(failure_message('updating_exports'));
			} else {
				log.info('check passed for package.json for `updating_exports`');
			}
		} else {
			log.info(
				changed_exports
					? `updated package.json exports with ${exports_count} total export${plural(
							exports_count,
					  )}`
					: 'no changes to exports in package.json',
			);
		}

		// add `/.well-known/package.json` as needed
		if (well_known_package_json) {
			const pkg = await load_package_json();
			const mapped = well_known_package_json === true ? pkg : await well_known_package_json(pkg);
			// TODO refactor
			if (mapped) {
				// copy the `package.json` over to `static/.well-known/` if configured unless it exists
				const svelte_config = await load_sveltekit_config();
				const static_assets = svelte_config?.kit?.files?.assets || 'static';
				const well_known_dir = strip_end(static_assets, '/') + '/.well-known';
				if (!(await exists(well_known_dir))) {
					await mkdir(well_known_dir, {recursive: true});
				}
				const package_json_path = well_known_dir + '/package.json';
				const new_contents = serialize_package_json(mapped);
				let changed_well_known_package_json = false;
				if (await exists(package_json_path)) {
					const old_contents = await readFile(package_json_path, 'utf8');
					if (new_contents === old_contents) {
						changed_well_known_package_json = false;
					} else {
						changed_well_known_package_json = true;
					}
				} else {
					changed_well_known_package_json = true;
				}
				if (check) {
					if (changed_well_known_package_json) {
						throw new TaskError(failure_message('updating_well_known'));
					} else {
						log.info('check passed for package.json for `updating_well_known`');
					}
				} else {
					if (changed_well_known_package_json) {
						log.info(`updating package_json_path`, package_json_path);
						await writeFile(package_json_path, new_contents);
					} else {
						log.info(`no changes to package_json_path`, package_json_path);
					}
				}
			}
		}
	},
};

// TODO extract?
const create_exports_filter = (include: string, exclude: string) => {
	const include_matcher = include && new RegExp(include, 'u');
	const exclude_matcher = exclude && new RegExp(exclude, 'u');
	return (path: string): boolean =>
		(!include_matcher || include_matcher.test(path)) &&
		(!exclude_matcher || !exclude_matcher.test(path));
};

const failure_message = (when: string): string =>
	'Failed exports check.' +
	` The package.json has unexpectedly changed at '${when}'.` +
	' Run `gro sync` or `gro exports` manually to inspect the changes, and check the `package_json` config option.';
