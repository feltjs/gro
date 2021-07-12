import type {Encoding} from 'src/fs/encoding.js';
import type {Filesystem} from 'src/fs/filesystem.js';

export const load_content = <T extends Encoding>(
	fs: Filesystem,
	encoding: T,
	id: string,
): Promise<T extends 'utf8' ? string : string | Buffer> =>
	encoding === null ? fs.read_file(id) : (fs.read_file(id, encoding as any) as any);
