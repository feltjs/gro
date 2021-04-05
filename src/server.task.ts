import type {Task} from './task/task.js';
import {toBuildOutPath} from './paths.js';
import {
	API_SERVER_BUILD_BASE_PATH,
	API_SERVER_BUILD_CONFIG_NAME,
} from './config/defaultBuildConfig.js';
import {spawn} from './utils/process.js';
import type {SpawnedProcess} from './utils/process.js';
import {pathExists} from './fs/nodeFs.js';
import {red} from './utils/terminal.js';

/*

Normally, you won't use this directly, but it's here
if you need it, and for educational purposes.
It's invoked by `src/dev.task.ts` and `src/build.task.ts`
as a default to support compatibility with SvelteKit.

If you see an error message with 3001 missing or something,
try running `gro server` to run this task file!
But it should be handled by the other tasks.

## usage

```bash
gro server
```

TODO configure port

*/

// export interface TaskArgs {
//   port?: string | number;
// }

export interface TaskEvents {
	'server.spawn': (spawned: SpawnedProcess) => void;
}

// TODO what's the best way to give a placeholder for the unused first `TArgs` type argument?
export const task: Task<{}, TaskEvents> = {
	description: 'start API server',
	run: async ({dev, events, log}) => {
		const serverPath = toBuildOutPath(
			dev,
			API_SERVER_BUILD_CONFIG_NAME,
			API_SERVER_BUILD_BASE_PATH,
		);
		if (!(await pathExists(serverPath))) {
			log.error(red('server path does not exist:'), serverPath);
			throw Error(`API server failed to start due to missing file: ${serverPath}`);
		}
		const spawned = spawn('node', [serverPath]);
		events.emit('server.spawn', spawned);
	},
};
