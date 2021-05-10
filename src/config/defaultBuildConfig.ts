import {createFilter} from '@rollup/pluginutils';

import type {BuildConfig, BuildConfigPartial} from './buildConfig.js';
import {
	toBuildExtension,
	basePathToSourceId,
	toBuildOutPath,
	paths,
	isThisProjectGro,
} from '../paths.js';
import {getExtensions} from '../fs/mime.js';
import type {EcmaScriptTarget} from '../build/tsBuildHelpers.js';
import type {Filesystem} from '../fs/filesystem.js';

export const DEFAULT_ECMA_SCRIPT_TARGET: EcmaScriptTarget = 'es2020';

export const GIT_DEPLOY_BRANCH = 'main'; // deploy and publish from this branch

// Gro currently enforces that the primary build config
// for the Node platform has this value as its name.
// This convention speeds up running tasks by standardizing where Gro can look for built files.
// This restriction could be relaxed by using cached metadata, but this keeps things simple for now.
export const PRIMARY_NODE_BUILD_NAME = 'node';

export const PRIMARY_NODE_BUILD_CONFIG: BuildConfig = {
	name: PRIMARY_NODE_BUILD_NAME,
	platform: 'node',
	input: [createFilter(['**/*.{task,test,config,gen}*.ts', '**/fixtures/**'])],
};

export const API_SERVER_SOURCE_BASE_PATH = 'server/server.ts';
export const API_SERVER_BUILD_BASE_PATH = toBuildExtension(API_SERVER_SOURCE_BASE_PATH); // 'server/server.js'
export const API_SERVER_SOURCE_ID = basePathToSourceId(API_SERVER_SOURCE_BASE_PATH); // '/home/to/your/src/server/server.ts'
export const hasApiServer = (fs: Filesystem): Promise<boolean> => fs.exists(API_SERVER_SOURCE_ID);
export const hasApiServerConfig = (buildConfigs: BuildConfig[]): boolean =>
	buildConfigs.some(
		(b) => b.name === API_SERVER_BUILD_NAME && b.platform === API_SERVER_BUILD_CONFIG_PLATFORM,
	);
export const API_SERVER_BUILD_NAME = 'server';
export const API_SERVER_BUILD_CONFIG_PLATFORM = 'node';
export const API_SERVER_BUILD_CONFIG: BuildConfig = {
	name: API_SERVER_BUILD_NAME,
	platform: API_SERVER_BUILD_CONFIG_PLATFORM,
	input: [API_SERVER_SOURCE_BASE_PATH],
};
// the first of these matches SvelteKit, the second is just close for convenience
// TODO change to remove the second, search upwards for an open port
export const API_SERVER_DEFAULT_PORT_PROD = 3000;
export const API_SERVER_DEFAULT_PORT_DEV = 3001;
export const toApiServerPort = (dev: boolean): number =>
	dev ? API_SERVER_DEFAULT_PORT_DEV : API_SERVER_DEFAULT_PORT_PROD;
export const toApiServerBuildPath = (dev: boolean, buildDir = paths.build): string =>
	toBuildOutPath(dev, API_SERVER_BUILD_NAME, API_SERVER_BUILD_BASE_PATH, buildDir);

const SVELTE_KIT_FRONTEND_PATHS = ['src/app.html', 'src/routes'];
export const hasSvelteKitFrontend = async (fs: Filesystem): Promise<boolean> =>
	!isThisProjectGro && (await everyPathExists(fs, SVELTE_KIT_FRONTEND_PATHS));

const DEPRECATED_GRO_FRONTEND_PATHS = ['src/index.html', 'src/index.ts'];
export const hasDeprecatedGroFrontend = async (fs: Filesystem): Promise<boolean> =>
	everyPathExists(fs, DEPRECATED_GRO_FRONTEND_PATHS);

export const toDefaultBrowserBuild = (assetPaths = toDefaultAssetPaths()): BuildConfigPartial => ({
	name: 'browser',
	platform: 'browser',
	input: ['index.ts', createFilter(`**/*.{${assetPaths.join(',')}}`)],
});
const toDefaultAssetPaths = (): string[] => Array.from(getExtensions());

const everyPathExists = async (fs: Filesystem, paths: string[]): Promise<boolean> =>
	(await Promise.all(paths.map((path) => fs.exists(path)))).every((v) => !!v);
