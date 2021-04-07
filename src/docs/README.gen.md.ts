import {dirname, relative, basename} from 'path';

import {Gen, toOutputFileName} from '../gen/gen.js';
import {paths, basePathToSourceId} from '../paths.js';
import {toPathParts, toPathSegments} from '../utils/path.js';
import {last} from '../utils/array.js';
import {stripStart} from '../utils/string.js';
import {findFiles} from '../fs/node.js';

// This renders a simple index of a possibly nested directory of files.

// TODO look at `tasks.gen.md.ts` to refactor and generalize
// TODO show nested structure, not a flat list
// TODO work with file types beyond markdown

export const gen: Gen = async ({originId}) => {
	// TODO need to get this from project config or something
	const rootPath = last(toPathSegments(paths.root));

	const originDir = dirname(originId);
	const originBase = basename(originId);

	const baseDir = paths.source;
	const relativePath = stripStart(originId, baseDir);
	const relativeDir = dirname(relativePath);

	// TODO should this be passed in the context, like `defaultOutputFileName`?
	const outputFileName = toOutputFileName(originBase);

	// TODO this is GitHub-specific
	const rootLink = `[${rootPath}](/../..)`;

	const docFiles = await findFiles(originDir);
	const docPaths: string[] = [];
	for (const [path, stats] of docFiles) {
		if (stats.isDirectory() || path === outputFileName || !path.endsWith('.md')) {
			continue;
		}
		docPaths.push(path);
	}
	const docs = docPaths;

	// TODO do we want to use absolute paths instead of relative paths,
	// because GitHub works with them and it simplifies the code?
	const isIndexFile = outputFileName === 'README.md';
	const pathParts = toPathParts(relativeDir).map((relativePathPart) =>
		isIndexFile && relativePathPart === relativeDir
			? relativePathPart
			: `[${last(toPathSegments(relativePathPart))}](${
					relative(originDir, basePathToSourceId(relativePathPart)) || './'
			  })`,
	);
	const breadcrumbs = '> <sub>' + [rootLink, ...pathParts, outputFileName].join(' / ') + '</sub>';

	// TODO render the footer with the originId
	return `# docs

${breadcrumbs}

${docs.reduce((docList, doc) => docList + `- [${basename(doc, '.md')}](${doc})\n`, '')}
${breadcrumbs}

> <sub>generated by [${originBase}](${originBase})</sub>
`;
};
