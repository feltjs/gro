import {Task} from './task/task.js';
import {CachingCompiler} from './compile/CachingCompiler.js';
import {createCompileFile} from './compile/compileFile.js';

const DEFAULT_SERVE_DIR = 'dist/';

export const task: Task = {
	description: 'start development server',
	run: async ({args, log, invokeTask}): Promise<void> => {
		// TODO fix these
		args.watch = true; // TODO always?
		args.dir = args.dir || DEFAULT_SERVE_DIR;
		// TODO also take HOST and PORT from env
		// .option('-H, --host', 'Hostname for the server')
		// .option('-p, --port', 'Port number for the server')
		// .option('-d, --dir', 'Directory to serve')
		// .option('-o, --outputDir', 'Directory for the build output')
		// .option('-w, --watch', 'Watch for changes and rebuild')
		// .option('-P, --production', 'Set NODE_ENV to production')

		// TODO how to do this?
		const dev = process.env.NODE_ENV === 'development';

		const compiler = new CachingCompiler({compileFile: createCompileFile({dev, log})});

		await Promise.all([invokeTask('build'), compiler.init(), invokeTask('serve')]);

		// ...
	},
};
