import {spawn} from '@feltjs/util/process.js';
import {z} from 'zod';

import {rainbow} from './util/colors.js';
import {TaskError, type Task} from './task/task.js';
import {cleanFs} from './fs/clean.js';
import {isThisProjectGro} from './paths.js';
import {toRawRestArgs} from './util/args.js';
import {GIT_DEPLOY_SOURCE_BRANCH} from './build/buildConfigDefaults.js';
import {loadPackageJson} from './util/packageJson.js';
import {findCli, spawnCli} from './util/cli.js';

// publish.task.ts
// - usage: `gro publish patch`
// - forwards args to `npm version`: https://docs.npmjs.com/cli/v6/commands/npm-version
// - runs the production build
// - publishes to npm from the `main` branch, configurable with `--branch`
// - syncs commits and tags to the configured main branch

const Args = z
	.object({
		branch: z.string({description: 'branch to publish from'}).default(GIT_DEPLOY_SOURCE_BRANCH),
		changelog: z
			.string({description: 'file name and path of the changelog'})
			.default('CHANGELOG.md'),
		dry: z
			.boolean({
				description:
					'build and prepare to publish without actually publishing, for diagnostic and testing purposes',
			})
			.default(false),
	})
	.strict();
type Args = z.infer<typeof Args>;

export const task: Task<Args> = {
	summary: 'bump version, publish to npm, and git push',
	production: true,
	Args,
	run: async ({fs, args, log}): Promise<void> => {
		const {branch, changelog, dry} = args;
		if (dry) {
			log.info(rainbow('dry run!'));
		}

		const changelogExists = await fs.exists(changelog);
		let version!: string;

		// Ensure Changesets is installed:
		if (!(await findCli(fs, 'changeset'))) {
			log.error('changeset command not found: install @changesets/cli locally or globally');
			return;
		}

		// Make sure we're on the right branch:
		await spawn('git', ['fetch', 'origin', branch]);
		await spawn('git', ['checkout', branch]);
		await spawn('git', ['pull', 'origin', branch]);

		// Rebuild everything -- TODO maybe optimize and only clean `buildProd`
		await cleanFs(fs, {build: true, dist: true}, log);
		if (isThisProjectGro) {
			const bootstrapResult = await spawn('npm', ['run', 'bootstrap']); // TODO serialize any/all args?
			if (!bootstrapResult.ok) throw Error('Failed to bootstrap Gro');
		}

		// Check in dev mode before proceeding.
		const checkResult = await spawn('npx', ['gro', 'check'], {
			env: {...process.env, NODE_ENV: 'development'},
		});
		if (!checkResult.ok) throw Error('gro check failed');

		// Bump the version so the package.json is updated before building:
		if (dry) {
			log.info('dry run, skipping changeset version');
		} else {
			const pkgBefore = await loadPackageJson(fs);
			if (typeof pkgBefore.version !== 'string') {
				throw new TaskError('failed to find package.json version');
			}

			const npmVersionResult = await spawnCli(fs, 'changeset', ['version']);
			if (!npmVersionResult?.ok) {
				throw Error('npm version failed: no commits were made: see the error above');
			}

			const pkgAfter = await loadPackageJson(fs, true);
			version = pkgAfter.version as string;
			if (pkgBefore.version === version) {
				throw new TaskError('changeset version failed: are there any changes?');
			}
		}

		// Build to create the final artifacts:
		const buildResult = await spawn('npx', ['gro', 'build', ...toRawRestArgs()]);
		if (!buildResult.ok) throw Error('gro build failed');

		if (dry) {
			log.info('publishing branch ' + branch);
			log.info(rainbow('dry run complete!'));
			return;
		}

		const npmPublishResult = await spawnCli(fs, 'changeset', ['publish']);
		if (!npmPublishResult?.ok) {
			throw new TaskError(
				'changeset publish failed - revert the version tag or run it again manually',
			);
		}

		if (!changelogExists && (await fs.exists(changelog))) {
			await spawn('git', ['add', changelog]);
		}
		await spawn('git', ['commit', '-a', '-m', `publish v${version}`]);
		await spawn('git', ['push', '--follow-tags']);
	},
};
