import {z} from 'zod';
import {spawn} from '@grogarden/util/process.js';
import {green, cyan} from 'kleur/colors';

import {Task_Error, type Task} from './task.js';
import {exists} from './fs.js';
import {resolve_gro_module_path} from './gro_helpers.js';

export const Args = z
	.object({
		_: z
			.array(z.string(), {description: 'the file path to run and other node CLI args'})
			.default([]),
	})
	.strict();
export type Args = z.infer<typeof Args>;

export const task: Task<Args> = {
	summary: 'execute a file with the loader, like `node` but works for TypeScript',
	Args,
	run: async ({args, log}) => {
		const {
			_: [path, ...argv],
		} = args;

		if (!path) {
			log.info(green('\n\nUsage: ') + cyan('gro run path/to/file.ts [...node_args]\n'));
			return;
		}

		if (!(await exists(path))) {
			throw new Task_Error('cannot find file to run at path: ' + path);
		}

		const loader_path = await resolve_gro_module_path('loader.js');
		const result = await spawn('node', [
			'--import',
			`data:text/javascript,
        import {register} from "node:module";
        import {pathToFileURL} from "node:url";
        register("${loader_path}", pathToFileURL("./"));`,
			'--enable-source-maps',
			path,
			...argv,
		]);

		if (!result.ok) {
			process.exit(result.code || 1);
		}
	},
};
