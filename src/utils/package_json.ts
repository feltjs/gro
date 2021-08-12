import {join} from 'path';
import type {Json} from '@feltcoop/felt/util/json.js';

import type {Filesystem} from 'src/fs/filesystem.js';
import {paths, gro_paths, is_this_project_gro} from '../paths.js';

// This is a single entrypoint for getting the `package.json` of both the current project and Gro.
// It's cached but can be reloaded with `force_refresh` flag.

// TODO fill out this type
export interface PackageJson {
	[key: string]: Json | undefined;
	name: string;
	main?: string;
	bin?: {[key: string]: string};
	files?: string[];
	exports?: Record<string, string>;
}
export interface GroPackageJson extends PackageJson {}

let package_json: PackageJson | undefined;
let gro_package_json: GroPackageJson | undefined;

export const load_package_json = async (
	fs: Filesystem,
	force_refresh = false,
): Promise<PackageJson> => {
	if (is_this_project_gro) return load_gro_package_json(fs, force_refresh);
	if (!package_json || force_refresh) {
		package_json = JSON.parse(await fs.read_file(join(paths.root, 'package.json'), 'utf8'));
	}
	return package_json!;
};
export const load_gro_package_json = async (
	fs: Filesystem,
	force_refresh = false,
): Promise<GroPackageJson> => {
	if (!gro_package_json || force_refresh) {
		gro_package_json = JSON.parse(await fs.read_file(join(gro_paths.root, 'package.json'), 'utf8'));
	}
	return gro_package_json!;
};

// gets the "b" of "@a/b" for namespaced packages
export const to_package_repo_name = (pkg: PackageJson): string =>
	pkg.name.includes('/') ? pkg.name.split('/').slice(1).join('/') : pkg.name;
