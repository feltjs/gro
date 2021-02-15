import {readFile} from '../fs/nodeFs.js';
import {Encoding} from '../fs/encoding.js';

export const loadContents = <T extends Encoding>(
	encoding: T,
	id: string,
): Promise<T extends 'utf8' ? string : string | Buffer> =>
	encoding === null ? readFile(id) : (readFile(id, encoding as any) as any);
