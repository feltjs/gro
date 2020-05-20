import {copy} from './fs/nodeFs.js';
import {Task} from './task/task.js';
import {paths} from './paths.js';
import {isTestBuildFile, isTestBuildArtifact} from './oki/testModule.js';
import {printPath} from './utils/print.js';
import {cleanDist} from './project/clean.js';
import {task as assetsTask} from './assets.task.js';

export const isDistFile = (path: string): boolean =>
	!isTestBuildFile(path) && !isTestBuildArtifact(path);

export const task: Task = {
	description: 'create the distribution',
	run: async (ctx) => {
		const {log} = ctx;

		await cleanDist(log);

		log.info(`copying ${printPath(paths.build)} to ${printPath(paths.dist)}`);
		await copy(paths.build, paths.dist, {
			filter: (id) => isDistFile(id),
		});

		await assetsTask.run(ctx);
	},
};
