import {type Plugin} from 'rollup';
import {dirname, join, relative} from 'path';
import sourcemapCodec from 'sourcemap-codec';
import {blue, gray} from '@feltcoop/felt/util/terminal.js';
import {SystemLogger, printLogLabel} from '@feltcoop/felt/util/log.js';
import {type Logger} from '@feltcoop/felt/util/log.js';

import {type Filesystem} from '../fs/filesystem.js';
import {type GroCssBuild, type GroCssBundle} from './groCssBuild.js';

export interface Options {
	fs: Filesystem;
	getCssBundles(): Map<string, GroCssBundle>;
	toFinalCss?: (build: GroCssBuild, log: Logger) => string | null;
	sourcemap?: boolean;
}

export const name = '@feltcoop/rollupPluginGroOutputCss';

export const rollupPluginGroOutputCss = (options: Options): Plugin => {
	const {fs, getCssBundles, toFinalCss = defaultToFinalCss, sourcemap = false} = options;

	const log = new SystemLogger(printLogLabel(name, blue));

	return {
		name,
		async generateBundle(outputOptions, _bundle, isWrite) {
			if (!isWrite) return;

			log.info('generateBundle');

			// TODO chunks!
			const outputDir = outputOptions.dir || dirname(outputOptions.file!);

			// write each changed bundle to disk
			for (const bundle of getCssBundles().values()) {
				const {bundleName, buildsById, changedIds} = bundle;
				if (!changedIds.size) {
					log.trace(`no changes detected, skipping bundle ${gray(bundleName)}`);
					continue;
				}

				// TODO try to avoid doing work for the sourcemap and `toFinalCss` by caching stuff that hasn't changed
				log.info('generating css bundle', blue(bundleName));
				log.info('changes', Array.from(changedIds)); // TODO trace when !watch
				changedIds.clear();

				const mappings: sourcemapCodec.SourceMapSegment[][] = [];
				const sources: string[] = [];
				const sourcesContent: string[] = [];

				// sort the css builds for determinism and so the cascade works according to import order
				const builds = Array.from(buildsById.values()).sort((a, b) =>
					a.sortIndex === b.sortIndex ? (a.id > b.id ? 1 : -1) : a.sortIndex > b.sortIndex ? 1 : -1,
				);

				// create the final css and sourcemap
				let cssStrings: string[] = [];
				for (const build of builds) {
					const code = toFinalCss(build, log);
					if (!code) continue;
					cssStrings.push(code);

					// add css sourcemap to later merge
					// TODO avoid work if there's a single sourcemap
					// TODO do we we ever want a warning/error if `build.map` is undefined?
					if (sourcemap && build.map && build.map.sourcesContent) {
						const sourcesLength = sources.length;
						sources.push(build.map.sources[0]);
						sourcesContent.push(build.map.sourcesContent[0]);
						const decoded = sourcemapCodec.decode(build.map.mappings);
						if (sourcesLength > 0) {
							for (const line of decoded) {
								for (const segment of line) {
									segment[1] = sourcesLength;
								}
							}
						}
						mappings.push(...decoded);
					}
				}
				const css = cssStrings.join('\n');

				const dest = join(outputDir, bundleName);

				if (sources.length) {
					const sourcemapDest = dest + '.map';
					const finalCss = css + `\n/*# sourceMappingURL=${bundleName}.map */\n`;
					const cssSourcemap = JSON.stringify(
						{
							version: 3,
							file: bundleName,
							sources: sources.map((s) => relative(outputDir, s)),
							sourcesContent,
							names: [],
							mappings: sourcemapCodec.encode(mappings),
						},
						null,
						2,
					);
					log.info('writing css bundle and sourcemap', dest);
					await Promise.all([
						fs.writeFile(dest, finalCss),
						fs.writeFile(sourcemapDest, cssSourcemap),
					]);
				} else {
					log.info('writing css bundle', dest);
					await fs.writeFile(dest, css);
				}
			}
		},
	};
};

const defaultToFinalCss = ({code}: GroCssBuild, _log: Logger): string | null => code;
