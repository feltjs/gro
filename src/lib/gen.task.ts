import {red, green, gray} from 'kleur/colors';
import {printMs, printError, printTimings} from '@feltjs/util/print.js';
import {plural} from '@feltjs/util/string.js';
import {createStopwatch, Timings} from '@feltjs/util/timings.js';
import {z} from 'zod';

import {TaskError, type Task} from './task/task.js';
import {runGen} from './gen/runGen.js';
import {loadGenModule, checkGenModules, findGenModules} from './gen/genModule.js';
import {resolveRawInputPaths} from './path/inputPath.js';
import {loadModules} from './fs/modules.js';
import {formatFile} from './format/formatFile.js';
import {printPath} from './path/paths.js';
import {loadConfig} from './config/config.js';
import {buildSource} from './build/buildSource.js';
import {logErrorReasons} from './task/logTask.js';

export const Args = z
	.object({
		_: z.array(z.string(), {description: 'paths to generate'}).default([]),
		check: z
			.boolean({description: 'exit with a nonzero code if any files need to be generated'})
			.default(false),
		rebuild: z.boolean({description: 'read this instead of no-rebuild'}).optional().default(true),
		'no-rebuild': z
			.boolean({description: 'opt out of rebuilding the code for efficiency'})
			.optional()
			.default(false),
	})
	.strict();
export type Args = z.infer<typeof Args>;

// TODO test - especially making sure nothing gets genned
// if there's any validation or import errors
export const task: Task<Args> = {
	summary: 'run code generation scripts',
	Args,
	run: async ({fs, log, args}): Promise<void> => {
		const {_: rawInputPaths, check, rebuild} = args;

		const totalTiming = createStopwatch();
		const timings = new Timings();

		// TODO hacky -- running `gro gen` from the command line
		// currently causes it to rebuild by default,
		// but running `gro gen` from dev/build tasks will not want to rebuild.
		if (rebuild) {
			const timingToLoadConfig = timings.start('load config');
			const config = await loadConfig(fs, true);
			timingToLoadConfig();
			const timingToBuildSource = timings.start('buildSource');
			await buildSource(fs, config, true, log);
			timingToBuildSource();
		}

		// resolve the input paths relative to src/lib/
		const inputPaths = resolveRawInputPaths(rawInputPaths);

		// load all of the gen modules
		const findModulesResult = await findGenModules(fs, inputPaths);
		if (!findModulesResult.ok) {
			logErrorReasons(log, findModulesResult.reasons);
			throw new TaskError('Failed to find gen modules.');
		}
		log.info('gen files', Array.from(findModulesResult.sourceIdsByInputPath.values()).flat());
		timings.merge(findModulesResult.timings);
		const loadModulesResult = await loadModules(
			findModulesResult.sourceIdsByInputPath,
			true,
			loadGenModule,
		);
		if (!loadModulesResult.ok) {
			logErrorReasons(log, loadModulesResult.reasons);
			throw new TaskError('Failed to load gen modules.');
		}
		timings.merge(loadModulesResult.timings);

		// run `gen` on each of the modules
		const stopTimingToGenerateCode = timings.start('generate code'); // TODO this ignores `genResults.elapsed` - should it return `Timings` instead?
		const genResults = await runGen(fs, loadModulesResult.modules, log, formatFile);
		stopTimingToGenerateCode();

		const failCount = genResults.failures.length;
		if (check) {
			// check if any files changed, and if so, throw errors,
			// but if there are gen failures, skip the check and defer to their errors
			if (!failCount) {
				log.info('checking generated files for changes');
				const stopTimingToCheckResults = timings.start('check results for changes');
				const checkGenModulesResults = await checkGenModules(fs, genResults);
				stopTimingToCheckResults();

				let hasUnexpectedChanges = false;
				for (const result of checkGenModulesResults) {
					if (!result.hasChanged) continue;
					hasUnexpectedChanges = true;
					log.error(
						red(
							`Generated file ${printPath(result.file.id)} via ${printPath(result.file.originId)} ${
								result.isNew ? 'is new' : 'has changed'
							}.`,
						),
					);
				}
				if (hasUnexpectedChanges) {
					throw new TaskError(
						'Failed gen check. Some generated files have unexpectedly changed.' +
							' Run `gro gen` and try again.',
					);
				}
				log.info('check passed, no files have changed');
			}
		} else {
			// write generated files to disk
			log.info('writing generated files to disk');
			const stopTimingToOutputResults = timings.start('output results');
			await Promise.all(
				genResults.successes
					.map((result) =>
						result.files.map((file) => {
							log.info('writing', printPath(file.id), 'generated from', printPath(file.originId));
							return fs.writeFile(file.id, file.content);
						}),
					)
					.flat(),
			);
			stopTimingToOutputResults();
		}

		let logResult = '';
		for (const result of genResults.results) {
			logResult += `\n\t${result.ok ? green('✓') : red('🞩')}  ${
				result.ok ? result.files.length : 0
			} ${gray('in')} ${printMs(result.elapsed)} ${gray('←')} ${printPath(result.id)}`;
		}
		log.info(logResult);
		log.info(
			green(
				`generated ${genResults.outputCount} file${plural(genResults.outputCount)} from ${
					genResults.successes.length
				} input file${plural(genResults.successes.length)}`,
			),
		);
		printTimings(timings, log);
		log.info(`🕒 ${printMs(totalTiming())}`);

		if (failCount) {
			for (const result of genResults.failures) {
				log.error(result.reason, '\n', printError(result.error));
			}
			throw new TaskError(`Failed to generate ${failCount} file${plural(failCount)}.`);
		}
	},
};
