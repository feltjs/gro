import {Plugin} from 'rollup';
import {green} from 'kleur';
import {createFilter} from 'rollup-pluginutils';

import {LogLevel, logger} from '../utils/logger';
import {CssBuild} from './cssCache';

export interface Options {
	addCssBuild(id: string, css: CssBuild): boolean;
	include: string | RegExp | (string | RegExp)[] | null | undefined;
	exclude: string | RegExp | (string | RegExp)[] | null | undefined;
	logLevel: LogLevel;
}
export type RequiredOptions = 'addCssBuild';
export type InitialOptions = PartialExcept<Options, RequiredOptions>;
export const initOptions = (opts: InitialOptions): Options => ({
	include: ['**/*.css'],
	exclude: undefined,
	logLevel: LogLevel.Info,
	...opts,
});

export const name = 'plain-css';

export const plainCssPlugin = (opts: InitialOptions): Plugin => {
	const {addCssBuild, include, exclude, logLevel} = initOptions(opts);

	const log = logger(logLevel, [green(`[${name}]`)]);
	const {info} = log;

	const filter = createFilter(include, exclude);

	return {
		name,
		async transform(code, id) {
			if (!filter(id)) return;
			info(`transform id`, id);

			// TODO new emit api? this and `return ''` below short-circuit rollup's pipeline!
			const updatedCache = addCssBuild(id, {id, code});

			// TODO understand this - might never occur
			if (!updatedCache) {
				throw Error(`Hmm...didn't expect this cache miss. TODO understand!`);
			}

			return '';
		},
	};
};
