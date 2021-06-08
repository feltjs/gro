import {to_root_path} from '../../paths.js';

export const renderTsHeaderAndFooter = (
	{origin_id}: {origin_id: string},
	contents: string,
): string => {
	const originRootPath = to_root_path(origin_id);
	return `// generated by ${originRootPath}

${contents}

// generated by ${originRootPath}`;
};
