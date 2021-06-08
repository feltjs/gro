import {toPackageRepoName} from '../utils/package_json.js';
import type {PackageJson} from '../utils/package_json.js';

export const to_sveltekit_base_path = (pkg: PackageJson, dev: boolean): string =>
	dev ? '' : `/${toPackageRepoName(pkg)}`;
