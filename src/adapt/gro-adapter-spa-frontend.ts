import {strip_trailing_slash, toCommonBaseDir} from '@feltcoop/felt/utils/path.js';
import {ensureEnd} from '@feltcoop/felt/utils/string.js';
import {Timings} from '@feltcoop/felt/utils/time.js';
import {EMPTY_OBJECT} from '@feltcoop/felt/utils/object.js';
import {print_timings} from '@feltcoop/felt/utils/print.js';

import type {Adapter} from './adapter.js';
import {runRollup} from '../build/rollup.js';
import {DIST_DIRNAME, source_id_to_base_path, to_build_extension, to_import_id} from '../paths.js';
import {print_build_config_label, to_input_files} from '../build/build_config.js';
import type {Build_Name} from '../build/build_config.js';
import {copyDist} from '../build/dist.js';
import {BROWSER_BUILD_NAME} from '../build/default_build_config.js';

// WIP do not use

const NOJEKYLL = '.nojekyll';
const DEFAULT_TARGET = 'github_pages';

export interface Options {
	builds: readonly Build_Name[];
	dir: string;
	target: 'github_pages' | 'static';
}

const DEFAULT_BUILD_NAMES: readonly Build_Name[] = [BROWSER_BUILD_NAME];

export const create_adapter = ({
	builds = DEFAULT_BUILD_NAMES,
	dir = DIST_DIRNAME,
	target = DEFAULT_TARGET,
}: Partial<Options> = EMPTY_OBJECT): Adapter => {
	dir = strip_trailing_slash(dir);
	return {
		name: '@feltcoop/gro-adapter-spa-frontend',
		begin: async ({fs}) => {
			await fs.remove(dir);
		},
		adapt: async ({config, fs, args, log, dev}) => {
			const {map_input_options, map_output_options, map_watch_options} = args;

			const timings = new Timings();

			// Not every build config is built for the final `dist/`!
			const build_configsToBuild = config.builds.filter((b) => builds.includes(b.name));

			// For each build config that has `dist: true`,
			// infer which of the inputs are actual source files,
			// and therefore belong in the default Rollup build.
			// If more customization is needed, users should implement their own `src/build.task.ts`,
			// which can be bootstrapped by copy/pasting this one. (and updating the imports)
			const timingToBundle = timings.start('bundle');
			await Promise.all(
				build_configsToBuild.map(async (build_config) => {
					const files = to_input_files(build_config.input);
					if (!files.length) {
						log.trace('no input files in', print_build_config_label(build_config));
						return;
					}
					const input = files.map((source_id) => to_import_id(source_id, dev, build_config.name));
					// TODO `files` needs to be mapped to production output files
					const outputDir = `${DIST_DIRNAME}/${to_build_extension(
						source_id_to_base_path(ensureEnd(toCommonBaseDir(files), '/')), // TODO refactor when fixing the trailing `/`
					)}`;
					log.info('building', print_build_config_label(build_config), outputDir, files);
					await runRollup({
						dev,
						sourcemap: config.sourcemap,
						input,
						outputDir,
						map_input_options,
						map_output_options,
						map_watch_options,
					});

					// copy static prod files into `dist/`
					await copyDist(fs, build_config, dev, `${dir}/${build_config.name}`, log);
				}),
			);
			timingToBundle();

			// GitHub pages processes everything with Jekyll by default,
			// breaking things like files and dirs prefixed with an underscore.
			// This adds a `.nojekyll` file to the root of the output
			// to tell GitHub Pages to treat the outputs as plain static files.
			if (target === 'github_pages') {
				const nojekyllPath = `${dir}/${NOJEKYLL}`;
				if (!(await fs.exists(nojekyllPath))) {
					await fs.writeFile(nojekyllPath, '', 'utf8');
				}
			}

			print_timings(timings, log);
		},
	};
};
