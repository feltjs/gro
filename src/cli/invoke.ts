// handle uncaught errors
import {attachProcessErrorHandlers} from '../utils/process.js';
attachProcessErrorHandlers();

// install source maps
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install({
	handleUncaughtExceptions: false,
});

// set up the env
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

import mri from 'mri';

// import {omitUndefined} from '../utils/object.js';
import {Args} from './types.js';
import {SystemLogger, Logger} from '../utils/log.js';
import {green, blue, cyan, gray} from '../colors/terminal.js';
import {runTask} from '../task/runTask.js';
import {Timings} from '../utils/time.js';
import {fmtMs, fmtError, fmtPath} from '../utils/fmt.js';
import {resolveRawInputPath, getPossibleSourceIds} from '../fs/inputPaths.js';
import {TASK_FILE_SUFFIX, isTaskPath, toTaskName} from '../task/task.js';
import {
	paths,
	groPaths,
	toBasePath,
	replaceRootDir,
	pathsFromId,
	isId,
} from '../paths.js';
import {findModules, loadModules} from '../fs/modules.js';
import {findFiles} from '../fs/nodeFs.js';
import {plural} from '../utils/string.js';
import {loadTaskModule} from '../task/taskModule.js';

const main = async () => {
	const argv: Args = mri(process.argv.slice(2));
	const log = new SystemLogger([blue(`[${green('gro')}]`)]);

	const {
		_: [taskName, ..._],
		...namedArgs
	} = argv;
	const args = {_, ...namedArgs};

	const timings = new Timings<'total' | 'run task'>();
	timings.start('total');

	// We search for tasks first in the current working directory,
	// and fall back to searching Gro's directory. (if they're different)
	const groDirIsCwd = paths.root === groPaths.root;

	// Resolve the input path for the provided task name.
	const inputPath = resolveRawInputPath(taskName || paths.source);

	// Find the task or directory specified by the `inputPath`.
	const findModulesResult = await findModules(
		[inputPath],
		id => findFiles(id, file => isTaskPath(file.path)),
		inputPath =>
			getPossibleSourceIds(inputPath, [TASK_FILE_SUFFIX], [groPaths.root]),
	);
	if (!findModulesResult.ok) {
		for (const reason of findModulesResult.reasons) {
			log.error(reason);
		}
		return;
	}
	const pathData = findModulesResult.sourceIdPathDataByInputPath.get(
		inputPath,
	)!;

	// Was the inputPath a directory? If so print its tasks but don't run anything.
	// It's surprising behavior to execute a task just by a directory!
	// If no tasks were found, it errors and exits above.
	if (pathData.isDirectory) {
		// Is the directory in the cwd and it's different than the Gro directory?
		// If so also search the Gro directory and print out any matches.
		const isGroPath = isId(pathData.id, groPaths);
		if (!groDirIsCwd && !isGroPath) {
			const groDirFindModulesResult = await findModules(
				[replaceRootDir(inputPath, groPaths.root)],
				id => findFiles(id, file => isTaskPath(file.path)),
			);
			// Ignore any errors - the directory may not exist or have any files!
			if (groDirFindModulesResult.ok) {
				printAvailableTasks(
					log,
					gray('gro/') + fmtPath(pathData.id),
					groDirFindModulesResult.sourceIdsByInputPath,
				);
			}
		}
		printAvailableTasks(
			log,
			(isGroPath ? gray('gro/') : '') + fmtPath(pathData.id),
			findModulesResult.sourceIdsByInputPath,
		);
		log.info(`🕒 ${fmtMs(timings.stop('total'))}`);
		return;
	}

	// Load the task.
	const loadModulesResult = await loadModules(
		findModulesResult.sourceIdsByInputPath,
		loadTaskModule,
	);

	if (!loadModulesResult.ok) {
		for (const reason of loadModulesResult.reasons) {
			log.error(reason);
		}
		return;
	}

	// Run the task!
	const task = loadModulesResult.modules[0];
	log.info(`→ ${cyan(task.name)}`);
	timings.start('run task');
	const result = await runTask(task, args, process.env);
	timings.stop('run task');
	log.info(`✓ ${cyan(task.name)}`);

	if (!result.ok) {
		log.error(result.reason, '\n', fmtError(result.error));
	}

	log.info(
		`${fmtMs(
			findModulesResult.timings.get('map input paths'),
		)} to map input paths`,
	);
	log.info(
		`${fmtMs(findModulesResult.timings.get('find files'))} to find files`,
	);
	log.info(
		`${fmtMs(loadModulesResult.timings.get('load modules'))} to load modules`,
	);
	log.info(`${fmtMs(timings.get('run task'))} to run task`);
	log.info(`🕒 ${fmtMs(timings.stop('total'))}`);
};

const printAvailableTasks = (
	log: Logger,
	dirLabel: string,
	sourceIdsByInputPath: Map<string, string[]>,
) => {
	const sourceIds = Array.from(sourceIdsByInputPath.values()).flat();
	if (sourceIds.length) {
		log.info(
			`${sourceIds.length} task${plural(sourceIds.length)} in ${dirLabel}:`,
		);
		for (const sourceId of sourceIds) {
			log.info(
				'\t' + cyan(toTaskName(toBasePath(sourceId, pathsFromId(sourceId)))),
			);
		}
	} else {
		log.info(`No tasks found in ${dirLabel}.`);
	}
};

main();
