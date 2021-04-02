import {pathExists, remove} from '../fs/nodeFs.js';
import {NODE_MODULES_PATH, paths, SVELTE_KIT_PATH} from '../paths.js';
import type {SystemLogger} from '../utils/log.js';
import {printPath} from '../utils/print.js';

export const clean = async (
	{
		build = false,
		dist = false,
		svelteKit = false,
		nodeModules = false,
	}: {build?: boolean; dist?: boolean; svelteKit?: boolean; nodeModules?: boolean},
	log: SystemLogger,
) =>
	Promise.all([
		build ? cleanDir(paths.build, log) : null,
		dist ? cleanDir(paths.dist, log) : null,
		svelteKit ? cleanDir(SVELTE_KIT_PATH, log) : null,
		nodeModules ? cleanDir(NODE_MODULES_PATH, log) : null,
	]);

export const cleanDir = async (path: string, log: SystemLogger): Promise<void> => {
	if (await pathExists(path)) {
		log.info('removing', printPath(path));
		await remove(path);
	}
};
