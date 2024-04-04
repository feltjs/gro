import {dirname, relative, basename} from 'node:path';
import {parse_path_parts, parse_path_segments} from '@ryanatkn/belt/path.js';
import {strip_start} from '@ryanatkn/belt/string.js';

import {type Gen, to_output_file_name} from '../gen.js';
import {paths, base_path_to_source_id} from '../paths.js';
import {search_fs} from '../search_fs.js';

// TODO look at `tasks.gen.md.ts` to refactor and generalize
// TODO show nested structure, not a flat list
// TODO work with file types beyond markdown

/**
 * Renders a simple index of a possibly nested directory of files.
 */
export const gen: Gen = async ({origin_id}) => {
	// TODO need to get this from project config or something
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
	const doc_files = await search_fs(origin_dir);
	const doc_paths: string[] = [];
	for (const path of doc_files.keys()) {
		if (path === output_file_name || !path.endsWith('.md')) {
			continue;
		}
		doc_paths.push(path);
	}

	// TODO do we want to use absolute paths instead of relative paths,
	// because GitHub works with them and it simplifies the code?
	const is_index_file = output_file_name === 'README.md';
	const path_parts = parse_path_parts(relative_dir).map((relative_path_part) => {
		const segment = parse_path_segments(relative_path_part).at(-1);
		return is_index_file && relative_path_part === relative_dir
			? segment
			: `[${segment}](${relative(origin_dir, base_path_to_source_id(relative_path_part)) || './'})`;
	});
	const breadcrumbs =
		'> <sub>' + [root_link, ...path_parts, output_file_name].join(' / ') + '</sub>';

	// TODO render the footer with the origin_id
	return `# docs

${breadcrumbs}

${doc_paths.reduce((docList, doc) => docList + `- [${basename(doc, '.md')}](${doc})\n`, '')}
${breadcrumbs}

> <sub>generated by [${origin_base}](${origin_base})</sub>
`;
};
