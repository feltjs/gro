import {dirname, relative, basename} from 'node:path';
import {parse_path_parts, parse_path_segments} from '@ryanatkn/belt/path.js';
import {strip_start} from '@ryanatkn/belt/string.js';

import {type Gen, to_output_file_name} from '../gen.js';
import {paths, base_path_to_path_id} from '../paths.js';
import {find_tasks, load_task_modules, load_tasks} from '../task_module.js';
import {log_error_reasons} from '../task_logging.js';
import {Task_Error} from '../task.js';

// This is the first simple implementation of Gro's automated docs.
// It combines Gro's gen and task systems
// to generate a markdown file describing all of the project's tasks.
// Other projects that use Gro should be able to import this module
// or other otherwise get frictionless access to this specific use case,
// and they should be able to extend or customize it to any degree.

// TODO display more info about each task, including a summary and params
// TODO needs some cleanup and better APIs - paths are confusing and verbose!
// TODO add backlinks to every document that links to this one

export const gen: Gen = async ({config, origin_id, log}) => {
	const found = await find_tasks([paths.lib], [paths.lib]);
	if (!found.ok) {
		log_error_reasons(log, found.reasons);
		throw new Task_Error(`Failed to generate task docs: ${found.type}`);
	}
	const found_tasks = found.value;

	const loaded = await load_tasks(found_tasks);
	if (!loaded.ok) {
		log_error_reasons(log, loaded.reasons);
		throw new Task_Error(`Failed to generate task docs: ${loaded.type}`);
	}
	const loaded_tasks = loaded.value;
	const tasks = loaded_tasks.modules;

	const root_path = parse_path_segments(paths.root).at(-1);

	const origin_dir = dirname(origin_id);
	const origin_base = basename(origin_id);

	const base_dir = paths.source;
	const relative_path = strip_start(origin_id, base_dir);
	const relative_dir = dirname(relative_path);

	// TODO should this be passed in the context, like `defaultOutputFileName`?
	const output_file_name = to_output_file_name(origin_base);

	// TODO this is GitHub-specific
	const root_link = `[${root_path}](/../..)`;

	// TODO do we want to use absolute paths instead of relative paths,
	// because GitHub works with them and it simplifies the code?
	const path_parts = parse_path_parts(relative_dir).map(
		(relative_path_part) =>
			`[${parse_path_segments(relative_path_part).at(-1)}](${
				relative(origin_dir, base_path_to_path_id(relative_path_part)) || './'
			})`,
	);
	const breadcrumbs =
		'> <sub>' + [root_link, ...path_parts, output_file_name].join(' / ') + '</sub>';

	// TODO render the footer with the origin_id
	return `# tasks

${breadcrumbs}

What is a \`Task\`? See [\`task.md\`](./task.md).

## all tasks

${tasks.reduce(
	(taskList, task) =>
		taskList +
		`- [${task.name}](${relative(origin_dir, task.id)})${
			task.mod.task.summary ? ` - ${task.mod.task.summary}` : ''
		}\n`,
	'',
)}
## usage

\`\`\`bash
$ gro some/name
\`\`\`

${breadcrumbs}

> <sub>generated by [${origin_base}](${origin_base})</sub>
`;
};
