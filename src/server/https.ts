import {join} from 'path';

import {stringFromEnv} from '../utils/env.js';
import {pathExists, readFile} from '../fs/node.js';
import type {Logger} from '../utils/log.js';

export interface HttpsCredentials {
	cert: string;
	key: string;
}

const DEFAULT_CERT_FILE: string = stringFromEnv('GRO_CERT_FILE', () =>
	join(process.cwd(), 'localhost-cert.pem'),
);
const DEFAULT_CERTKEY_FILE: string = stringFromEnv('GRO_CERTKEY_FILE', () =>
	join(process.cwd(), 'localhost-privkey.pem'),
);

// Tries to load the given cert and key, returning `null` if unable.
export const loadHttpsCredentials = async (
	log: Logger,
	certFile = DEFAULT_CERT_FILE,
	keyFile = DEFAULT_CERTKEY_FILE,
): Promise<HttpsCredentials | null> => {
	const [certExists, keyExists] = await Promise.all([pathExists(certFile), pathExists(keyFile)]);
	if (!certExists && !keyExists) return null;
	if (certExists && !keyExists) {
		log.warn('https cert exists but the key file does not', keyFile);
		return null;
	}
	if (!certExists && keyExists) {
		log.warn('https key exists but the cert file does not', certFile);
		return null;
	}
	const [cert, key] = await Promise.all([readFile(certFile, 'utf8'), readFile(keyFile, 'utf8')]);
	return {cert, key};
};
