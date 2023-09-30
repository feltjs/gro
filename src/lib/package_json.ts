import {z} from 'zod';
import {join} from 'node:path';
import {readFile, writeFile} from 'node:fs/promises';

import {
	paths,
	gro_paths,
	is_this_project_gro,
	replace_extension,
	SVELTEKIT_DIST_DIRNAME,
	Url,
	Email,
} from './paths.js';

export const PackageJsonRepository = z.union([
	z.string(),
	z
		.object({
			type: z.string(),
			url: Url,
			directory: z.string().optional(),
		})
		.passthrough(),
]);
export type PackageJsonRepository = z.infer<typeof PackageJsonRepository>;

export const PackageJsonAuthor = z.union([
	z.string(),
	z
		.object({
			name: z.string(),
			email: Email.optional(),
			url: Url.optional(),
		})
		.passthrough(),
]);
export type PackageJsonAuthor = z.infer<typeof PackageJsonAuthor>;

export const PackageJsonFunding = z.union([
	z.string(),
	z
		.object({
			type: z.string(),
			url: Url,
		})
		.passthrough(),
]);
export type PackageJsonFunding = z.infer<typeof PackageJsonFunding>;

export const PackageJsonExports = z.record(z.record(z.string()).optional());
export type PackageJsonExports = z.infer<typeof PackageJsonExports>;

/**
 * @see https://docs.npmjs.com/cli/v10/configuring-npm/package-json
 */
export const PackageJson = z.intersection(
	z.record(z.unknown()),
	z
		.object({
			// according to the npm docs, `name` and `version` are the only required properties
			name: z.string(),
			version: z.string(),

			private: z
				.boolean({
					description:
						'disallow npm publish, and also used by Gro to disable `package.json` automations',
				})
				.optional(),

			description: z.string().optional(),
			license: z.string().optional(),
			homepage: Url.optional(),
			repository: z.union([z.string(), Url, PackageJsonRepository]).optional(),
			author: z.union([z.string(), PackageJsonAuthor.optional()]),
			contributors: z.array(z.union([z.string(), PackageJsonAuthor])).optional(),
			bugs: z
				.union([z.string(), z.object({url: Url.optional(), email: Email.optional()}).passthrough()])
				.optional(),
			funding: z
				.union([Url, PackageJsonFunding, z.array(z.union([Url, PackageJsonFunding]))])
				.optional(),
			keywords: z.array(z.string()).optional(),

			scripts: z.record(z.string()).optional(),

			bin: z.record(z.string()).optional(),
			files: z.array(z.string()).optional(),
			exports: PackageJsonExports.optional(),

			dependencies: z.record(z.string()).optional(),
			devDependencies: z.record(z.string()).optional(),
			peerDependencies: z.record(z.string()).optional(),
			peerDependenciesMeta: z.record(z.record(z.string())).optional(),
			optionalDependencies: z.record(z.string()).optional(),

			engines: z.record(z.string()).optional(),
			os: z.array(z.string()).optional(),
			cpu: z.array(z.string()).optional(),
		})
		.passthrough(),
);
export type PackageJson = z.infer<typeof PackageJson>;

export interface MapPackageJson {
	(pkg: PackageJson, when: MapPackageJsonWhen): PackageJson | null | Promise<PackageJson | null>;
}

export type MapPackageJsonWhen = 'updating_exports' | 'updating_well_known';

// TODO parse on load? sounds like a worse DX, maybe just log a warning?
export const load_package_json = async (): Promise<PackageJson> =>
	is_this_project_gro
		? load_gro_package_json()
		: JSON.parse(await load_package_json_contents(paths.root));

export const load_gro_package_json = async (): Promise<PackageJson> =>
	JSON.parse(await load_package_json_contents(gro_paths.root));

// TODO probably make this nullable and make callers handle failures
const load_package_json_contents = (root_dir: string): Promise<string> =>
	readFile(join(root_dir, 'package.json'), 'utf8');

export const write_package_json = async (serialized_pkg: string): Promise<void> => {
	await writeFile(join(paths.root, 'package.json'), serialized_pkg);
};

export const serialize_package_json = (pkg: PackageJson): string => {
	PackageJson.parse(pkg);
	return JSON.stringify(pkg, null, 2) + '\n';
};

/**
 * Updates package.json. Writes to the filesystem only when contents change.
 * @returns boolean indicating if the file changed
 */
export const update_package_json = async (
	update: (pkg: PackageJson) => PackageJson | null | Promise<PackageJson | null>,
	write = true,
): Promise<boolean> => {
	const original_pkg_contents = await load_package_json_contents(paths.root);
	const original_pkg = JSON.parse(original_pkg_contents);
	const updated_pkg = await update(original_pkg);
	if (updated_pkg === null) return false;
	const updated_contents = serialize_package_json(updated_pkg);
	if (updated_contents === original_pkg_contents) {
		return false;
	}
	if (write) await write_package_json(updated_contents);
	return true;
};

// TODO do this with zod?
/**
 * Mutates `pkg` to normalize it for convenient usage.
 * For example, users don't have to worry about empty `exports` objects,
 * which fail schema validation.
 */
export const normalize_package_json = (pkg: PackageJson): PackageJson => {
	if (pkg.exports && Object.keys(pkg.exports).length === 0) {
		pkg.exports = undefined;
	}
	return pkg;
};

export const to_package_exports = (paths: string[]): PackageJsonExports => {
	const sorted = paths
		.slice()
		.sort((a, b) => (a === 'index.ts' ? -1 : b === 'index.ts' ? 1 : a.localeCompare(b)));
	const exports: PackageJsonExports = {};
	for (const path of sorted) {
		if (path.endsWith('.ts')) {
			const js_path = replace_extension(path, '.js');
			const key = path === 'index.ts' ? '.' : './' + js_path;
			exports[key] = {
				default: IMPORT_PREFIX + js_path,
				types: IMPORT_PREFIX + replace_extension(path, '.d.ts'),
			};
		} else if (path.endsWith('.js')) {
			const key = path === 'index.js' ? '.' : './' + path;
			exports[key] = {
				default: IMPORT_PREFIX + path,
				types: IMPORT_PREFIX + replace_extension(path, '.d.ts'), // assuming JSDoc types
			};
		} else if (path.endsWith('.svelte')) {
			exports['./' + path] = {
				svelte: IMPORT_PREFIX + path,
				types: IMPORT_PREFIX + path + '.d.ts',
			};
		} else {
			exports['./' + path] = {
				default: IMPORT_PREFIX + path,
			};
		}
	}
	return PackageJsonExports.parse(exports);
};

const IMPORT_PREFIX = './' + SVELTEKIT_DIST_DIRNAME + '/';
