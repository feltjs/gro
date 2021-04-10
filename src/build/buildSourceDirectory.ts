import {printMs, printTiming} from '../utils/print.js';
import type {Logger} from '../utils/log.js';
import {createStopwatch, Timings} from '../utils/time.js';
import {paths} from '../paths.js';
import {Filer} from '../build/Filer.js';
import {createDefaultBuilder} from './defaultBuilder.js';
import type {GroConfig} from '../config/config.js';
import type {Filesystem} from '../fs/filesystem.js';

export const buildSourceDirectory = async (
	fs: Filesystem,
	config: GroConfig,
	dev: boolean,
	log: Logger,
): Promise<void> => {
	log.info('building source directory');

	const totalTiming = createStopwatch();
	const timings = new Timings();
	const logTimings = () => {
		for (const [key, timing] of timings.getAll()) {
			log.trace(printTiming(key, timing));
		}
		log.info(`🕒 built in ${printMs(totalTiming())}`);
	};

	const timingToCreateFiler = timings.start('create filer');
	const filer = new Filer({
		fs,
		builder: createDefaultBuilder(),
		sourceDirs: [paths.source],
		buildConfigs: config.builds,
		watch: false,
		target: config.target,
		sourcemap: config.sourcemap,
		dev,
	});
	timingToCreateFiler();

	const timingToInitFiler = timings.start('init filer');
	await filer.init();
	timingToInitFiler();

	filer.close();

	logTimings();
};
