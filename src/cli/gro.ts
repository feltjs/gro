#!/usr/bin/env node

import {existsSync, realpathSync} from 'fs';
import {join, resolve} from 'path';
import {fileURLToPath} from 'url';

/*

This file is a loader for the Gro CLI.
Its only purpose is to import the `invoke.js` script in the correct directory.
It lets the global Gro CLI defer to a local installation
of Gro if one is available,
and it also provides special handling for the case
where we're running Gro inside Gro's own repo for development.

case 1:

We're in a directory that has a local installation of Gro.
Use the local version instead of the global.

TODO This only finds the local version of Gro
when the current working directory has `node_modules/.bin/gro`.
Should being nested directories be supported? How?
I couldn't find a way to do that with Node
without using undocumented behavior like this does:
https://github.com/sindresorhus/resolve-from
Another option is to search recursively upwards,
but we won't try to fix this until we have an immediate need
and we're sure it's a good idea.

case 2:

We're running Gro inside the Gro repo itself.

In this case, we use the build directory instead of dist.
There's a paradox here for using Gro inside itself -
ideally we use the dist directory because that's what's shipped,
but the build directory has all of the tests,
and loading two instances of its modules causes problems
like `instanceof` checks failing.
For now we'll just run from build and see if it causes any problems.
There's probably a better design in here somewhere.

case 3:

Fall back to invoking Gro from wherever the CLI is being executed.
When using the global CLI, this uses the global Gro installation.

*/

const main = (): Promise<void> => {
	const groBinPath = resolve('node_modules/.bin/gro');
	if (existsSync(groBinPath)) {
		// case 1
		// Prefer any locally installed version of Gro.
		return import(join(realpathSync(groBinPath), '../invoke.js'));
	} else {
		// case 2
		// If running Gro inside its own repo, require the local development build.
		// If the local build is not available,
		// the global version can be used to build the project.
		const filePath = fileURLToPath(import.meta.url);
		// This detection is not airtight, but seems good enough.
		// TODO This currently only tests the production build if the dev one doesn't exist.
		// The correct thing is probably to see which one was created most recently,
		// but I don't think that's easy until we start caching metadata.
		if (existsSync('.gro/dev/node/cli/gro.js') && existsSync('.gro/dev/node/cli/invoke.js')) {
			return import(join(filePath, '../../../.gro/dev/node/cli/invoke.js'));
		}
		if (existsSync('.gro/prod/node/cli/gro.js') && existsSync('.gro/prod/node/cli/invoke.js')) {
			return import(join(filePath, '../../../.gro/prod/node/cli/invoke.js'));
		}
		// case 3
		// Fall back to the version associated with the running CLI.
		return import(join(filePath, '../invoke.js'));
	}
};

main();
