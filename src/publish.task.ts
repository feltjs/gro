import {createInterface as createReadlineInterface} from 'readline';

import type {Task} from './task/task.js';
import {spawnProcess} from './utils/process.js';
import {green, bgBlack, rainbow, red, yellow} from './utils/terminal.js';
import {loadPackageJson} from './utils/packageJson.js';
import type {Logger} from './utils/log.js';
import {GIT_DEPLOY_BRANCH} from './config/defaultBuildConfig.js';
import type {Filesystem} from './fs/filesystem.js';
import {UnreachableError} from './utils/error.js';

// publish.task.ts
// - usage: `gro publish patch`
// - forwards args to `npm version`: https://docs.npmjs.com/cli/v6/commands/npm-version
// - runs the production build
// - publishes to npm from the `main` branch, configurable with `--branch`
// - syncs commits and tags to the configured main branch

// TODO add `dry` option so it can be tested

type VersionIncrement = string;
const validateVersionIncrement: ValidateVersionIncrement = (v) => {
	if (!v || typeof v !== 'string') {
		throw Error(
			`Expected a version increment like one of patch|minor|major, e.g. gro publish patch`,
		);
	}
};
interface ValidateVersionIncrement {
	(v: unknown): asserts v is VersionIncrement;
}

export interface TaskArgs {
	_: string[];
	branch?: string;
}

export const task: Task<TaskArgs> = {
	description: 'bump version, publish to npm, and sync to GitHub',
	run: async ({fs, args, log, invokeTask}): Promise<void> => {
		const {branch = GIT_DEPLOY_BRANCH} = args;

		const versionIncrement = args._[0];
		validateVersionIncrement(versionIncrement);

		// Confirm with the user that we're doing what they expect:
		await confirmWithUser(fs, versionIncrement, log);

		// Make sure we're on the right branch:
		await spawnProcess('git', ['checkout', branch]);

		// And updated to the latest:
		await spawnProcess('git', ['pull']);

		// Make sure everything is in working order, and then create the final artifacts:
		await invokeTask('check');
		await invokeTask('build');

		await spawnProcess('npm', ['version', ...process.argv.slice(3)]);
		await spawnProcess('npm', ['publish']);
		await spawnProcess('git', ['push']);
		await spawnProcess('git', ['push', '--tags']);
	},
};

const confirmWithUser = async (
	fs: Filesystem,
	versionIncrement: string,
	log: Logger,
): Promise<void> => {
	const readline = createReadlineInterface({input: process.stdin, output: process.stdout});
	await new Promise<void>(async (resolve) => {
		const [
			[currentChangelogVersion, previousChangelogVersion],
			currentPackageVersion,
		] = await Promise.all([getChangelogVersions(fs), getCurrentPackageVersion(fs)]);

		log.info(green(versionIncrement), '← version increment');
		log.info(green(currentChangelogVersion || '<empty>'), '← current changelog version');
		log.info(green(previousChangelogVersion || '<empty>'), '← previous changelog version');
		log.info(green(currentPackageVersion), '← current package version');

		let errored = false;
		const logError = (...args: any[]) => {
			errored = true;
			log.error(...args);
		};

		if (currentChangelogVersion === currentPackageVersion) {
			logError(red('Current changelog version matches package version. Is the changelog updated?'));
		}
		if (previousChangelogVersion !== currentPackageVersion) {
			logError(
				red(
					'Previous changelog version does not match package version.' +
						' Is there an unpublished version in the changelog?',
				),
			);
		}

		const currentChangelogVersionParts = currentChangelogVersion?.split('.'); // v
		const currentPackageVersionParts = currentPackageVersion?.split('.'); // v - 1
		const previousChangelogVersionParts = previousChangelogVersion?.split('.'); // v - 1

		const validateParts = (versionIncrement: 'major' | 'minor' | 'patch') => {
			if (!currentChangelogVersionParts) {
				return logError(
					'expected `currentChangelogVersion` to be major.minor.patch:',
					currentChangelogVersion,
				);
			} else if (currentChangelogVersionParts.length !== 3) {
				return logError('malformed `currentChangelogVersion`:', currentChangelogVersion);
			}
			if (!currentPackageVersionParts) {
				return logError(
					'expected `currentPackageVersion` to be major.minor.patch:',
					currentPackageVersion,
				);
			} else if (currentPackageVersionParts.length !== 3) {
				return logError('malformed `currentPackageVersion`:', currentPackageVersion);
			}
			if (!previousChangelogVersionParts) {
				return logError(
					'expected `previousChangelogVersion` to be major.minor.patch:',
					previousChangelogVersion,
				);
			} else if (previousChangelogVersionParts.length !== 3) {
				return logError('malformed `previousChangelogVersion`:', previousChangelogVersion);
			}
			// TODO predict what it should be, and compare to currentChangelogVersion
			if (versionIncrement === 'major') {
				currentChangelogVersionParts[0]; // TODO
				currentPackageVersionParts[0]; // TODO
				previousChangelogVersionParts[0]; // TODO
			} else if (versionIncrement === 'minor') {
				currentChangelogVersionParts[1]; // TODO
				currentPackageVersionParts[1]; // TODO
				previousChangelogVersionParts[1]; // TODO
			} else if (versionIncrement === 'patch') {
				currentChangelogVersionParts[2]; // TODO
				currentPackageVersionParts[2]; // TODO
				previousChangelogVersionParts[2]; // TODO
			} else {
				throw new UnreachableError(versionIncrement);
			}
		};

		if (
			versionIncrement === 'major' ||
			versionIncrement === 'minor' ||
			versionIncrement === 'patch'
		) {
			validateParts(versionIncrement);
		} else {
			errored = true;
			log.warn('unknown version increment: please review the following carefully:');
			log.info(yellow(versionIncrement), '← version increment');
			log.info(yellow(currentChangelogVersion || '<empty>'), '← current changelog version (new)');
			log.info(yellow(previousChangelogVersion || '<empty>'), '← previous changelog version (old)');
			log.info(yellow(currentPackageVersion), '← current package version (old)');
		}

		const expectedAnswer = errored ? 'yes!!' : 'y';
		if (errored) {
			log.warn(`there's an error above, please read before proceeding`);
		}
		readline.question(
			bgBlack(`does this look correct? type "${expectedAnswer}" to proceed`) + ' ',
			(answer) => {
				const lowercasedAnswer = answer.toLowerCase();
				if (lowercasedAnswer !== expectedAnswer) {
					log.info(green('exiting task with no changes'));
					process.exit();
				}
				log.info(rainbow('proceeding'));
				readline.close();
				resolve();
			},
		);
	});
};

// TODO document this better
// TODO move where?
// TODO refactor? this code is quick & worky
const getChangelogVersions = async (
	fs: Filesystem,
): Promise<[currentChangelogVersion?: string, previousChangelogVersion?: string]> => {
	const changelogMatcher = /##.+/g;
	const changelog = await fs.readFile('changelog.md', 'utf8');
	const matchCurrent = changelog.match(changelogMatcher);
	if (!matchCurrent) return [];
	return matchCurrent.slice(0, 2).map((line) => line.slice(2).trim()) as [string, string];
};

// TODO move where?
const getCurrentPackageVersion = async (fs: Filesystem): Promise<string> => {
	const pkg = await loadPackageJson(fs);
	if (!pkg.version || typeof pkg.version !== 'string') {
		throw Error(`Expected package.json to have a valid version: ${pkg.version}`);
	}
	return pkg.version;
};
