import {dirname, relative, basename} from 'path';
import {toPathParts, toPathSegments} from '@feltjs/util/path-parsing.js';
import {stripStart} from '@feltjs/util/string.js';

import {type Gen, toOutputFileName} from '../gen/gen.js';
import {paths, basePathToSourceId} from '../paths.js';
import {loadTaskModules} from '../task/taskModule.js';

// This is the first simple implementation of Gro's automated docs.
// It combines Gro's gen and task systems
// to generate a markdown file describing all of the project's tasks.
// Other projects that use Gro should be able to import this module
// or other otherwise get frictionless access to this specific use case,
// and they should be able to extend or customize it to any degree.

// TODO display more info about each task, including a summary and params
// TODO needs some cleanup and better APIs - paths are confusing and verbose!
// TODO add backlinks to every document that links to this one

export const gen: Gen = async ({fs, originId, log}) => {
	const result = await loadTaskModules(fs);
	if (!result.ok) {
		for (const reason of result.reasons) {
			log.error(reason);
		}
		throw new Error(result.type);
	}
	const tasks = result.modules;

	// TODO need to get this from project config or something
	const rootPath = toPathSegments(paths.root).at(-1);

	const originDir = dirname(originId);
	const originBase = basename(originId);

	const baseDir = paths.source;
	const relativePath = stripStart(originId, baseDir);
	const relativeDir = dirname(relativePath);

	// TODO should this be passed in the context, like `defaultOutputFileName`?
	const outputFileName = toOutputFileName(originBase);

	// TODO this is GitHub-specific
	const rootLink = `[${rootPath}](/../..)`;

	// TODO do we want to use absolute paths instead of relative paths,
	// because GitHub works with them and it simplifies the code?
	const pathParts = toPathParts(relativeDir).map(
		(relativePathPart) =>
			`[${toPathSegments(relativePathPart).at(-1)}](${
				relative(originDir, basePathToSourceId(relativePathPart)) || './'
			})`,
	);
	const breadcrumbs = '> <sub>' + [rootLink, ...pathParts, outputFileName].join(' / ') + '</sub>';

	// TODO render the footer with the originId
	return `# tasks

${breadcrumbs}

What is a \`Task\`? See [\`task.md\`](./task.md).

## all tasks

${tasks.reduce(
	(taskList, task) =>
		taskList +
		`- [${task.name}](${relative(originDir, task.id)})${
			task.mod.task.summary ? ` - ${task.mod.task.summary}` : ''
		}\n`,
	'',
)}
## usage

\`\`\`bash
$ gro some/task/name
\`\`\`

${breadcrumbs}

> <sub>generated by [${originBase}](${originBase})</sub>
`;
};
