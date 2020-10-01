import {spawnProcess} from '../utils/process.js';
import {printMs, printTiming} from '../utils/print.js';
import {Logger} from '../utils/log.js';
import {createStopwatch, Timings} from '../utils/time.js';
import {paths, TS_EXTENSION} from '../paths.js';
import {Filer} from '../fs/Filer.js';
import {createDefaultCompiler} from './defaultCompiler.js';

export const compileSourceDirectory = async (dev: boolean, log: Logger): Promise<void> => {
	log.info('compiling...');

	const totalTiming = createStopwatch();
	const timings = new Timings();
	const logTimings = () => {
		for (const [key, timing] of timings.getAll()) {
			log.trace(printTiming(key, timing));
		}
		log.info(`🕒 compiled in ${printMs(totalTiming())}`);
	};

	let include: ((id: string) => boolean) | undefined = undefined;

	if (!dev) {
		const timingToCompileWithTsc = timings.start('compile with tsc');
		await spawnProcess('node_modules/.bin/tsc'); // ignore compiler errors
		timingToCompileWithTsc();
		include = (id: string) => !id.endsWith(TS_EXTENSION);
	}

	const timingToCreateFiler = timings.start('create filer');
	const filer = new Filer({
		compiler: createDefaultCompiler({dev, log}, {dev, log}),
		compiledDirs: [{sourceDir: paths.source, outDir: paths.build}],
		watch: false,
		include,
	});
	timingToCreateFiler();

	const timingToInitFiler = timings.start('init filer');
	await filer.init();
	timingToInitFiler();

	filer.destroy();

	logTimings();
};
