import {ensureDir} from '../fs/nodeFs.js';
import {DEBOUNCE_DEFAULT, watchNodeFs} from '../fs/watchNodeFs.js';
import type {WatchNodeFs} from '../fs/watchNodeFs.js';
import {Compiler} from '../compile/compiler.js';
import {UnreachableError} from '../utils/error.js';
import {PathStats} from '../fs/pathData.js';

// Compiled filer dirs are watched, compiled, and written to disk.
// For non-compilable dirs, the `dir` is only watched and nothing is written to the filesystem.
// Externals dirs require special handling - see the `Filer` for more.
export type FilerDir = CompilableFilerDir | NonCompilableInternalsFilerDir;
export type CompilableFilerDir = CompilableInternalsFilerDir | ExternalsFilerDir;
export type FilerDirType = 'files' | 'externals';
export interface CompilableInternalsFilerDir extends BaseFilerDir {
	readonly type: 'files';
	readonly compilable: true;
	readonly compiler: Compiler;
}
export interface NonCompilableInternalsFilerDir extends BaseFilerDir {
	readonly type: 'files';
	readonly compilable: false;
	readonly compiler: null;
}
export interface ExternalsFilerDir extends BaseFilerDir {
	readonly type: 'externals';
	readonly compilable: true;
	readonly compiler: Compiler;
}

interface BaseFilerDir {
	readonly dir: string;
	readonly watcher: WatchNodeFs;
	readonly onChange: FilerDirChangeCallback;
	readonly close: () => void;
	readonly init: () => Promise<void>;
}

export interface FilerDirChange {
	type: FilerDirChangeType;
	path: string;
	stats: PathStats;
}
export type FilerDirChangeType = 'init' | 'create' | 'update' | 'delete';
export type FilerDirChangeCallback = (change: FilerDirChange, filerDir: FilerDir) => Promise<void>;

export const createFilerDir = (
	dir: string,
	type: FilerDirType,
	compiler: Compiler | null,
	onChange: FilerDirChangeCallback,
	watch: boolean,
	watcherDebounce: number = DEBOUNCE_DEFAULT,
): FilerDir => {
	const watcher = watchNodeFs({
		dir,
		onChange: (change) => onChange(change, filerDir),
		debounce: watcherDebounce,
		watch,
	});
	const close = () => {
		watcher.close();
	};
	const init = async () => {
		await ensureDir(dir);
		const statsBySourcePath = await watcher.init();
		await Promise.all(
			Array.from(statsBySourcePath.entries()).map(([path, stats]) =>
				stats.isDirectory() ? null : onChange({type: 'init', path, stats}, filerDir),
			),
		);
	};
	let filerDir: FilerDir;
	switch (type) {
		case 'files': {
			if (compiler === null) {
				filerDir = {
					type: 'files',
					compilable: false,
					compiler: null,
					dir,
					onChange,
					watcher,
					close,
					init,
				};
			} else {
				filerDir = {
					type: 'files',
					compilable: true,
					compiler,
					dir,
					onChange,
					watcher,
					close,
					init,
				};
			}
			break;
		}
		case 'externals': {
			if (compiler === null) {
				throw Error(`A compiler is required for directories with type '${type}'.`);
			} else {
				filerDir = {
					type: 'externals',
					compilable: true,
					compiler,
					dir,
					onChange,
					watcher,
					close,
					init,
				};
			}
			break;
		}
		default:
			throw new UnreachableError(type);
	}
	return filerDir;
};
