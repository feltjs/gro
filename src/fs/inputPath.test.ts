import {resolve, sep, join} from 'path';

import {test, t} from '../oki/oki.js';
import {
	resolveRawInputPath,
	resolveRawInputPaths,
	loadSourcePathDataByInputPath,
	loadSourceIdsByInputPath,
	getPossibleSourceIds,
} from './inputPath.js';
import {PathStats} from './pathData.js';
import {groPaths, replaceRootDir, createPaths, paths} from '../paths.js';

test('resolveRawInputPath()', () => {
	const target = resolve('src/foo/bar.ts');
	t.is(resolveRawInputPath('foo/bar.ts'), target);
	t.is(resolveRawInputPath('src/foo/bar.ts'), target);
	t.is(resolveRawInputPath('./src/foo/bar.ts'), target);
	t.is(resolveRawInputPath('./foo/bar.ts'), target); // questionable
	t.is(resolveRawInputPath(target), target);
	t.isNot(resolveRawInputPath('bar.ts'), target);

	test('source directory', () => {
		const targetDir = resolve('src') + '/'; // inferred as directory
		t.is(resolveRawInputPath('src'), targetDir);
		t.is(resolveRawInputPath('src/'), targetDir);
		t.is(resolveRawInputPath('./src'), targetDir);
		t.is(resolveRawInputPath('./src/'), targetDir);
		t.is(resolveRawInputPath('./srcTest'), targetDir + 'srcTest');
		t.is(resolveRawInputPath('srcTest'), targetDir + 'srcTest');
		t.isNot(resolveRawInputPath('build'), targetDir);
	});

	test('forced gro directory', () => {
		const fakeDir = resolve('../fake') + sep;
		const fakePaths = createPaths(fakeDir);
		const groTarget = resolve('src/foo/bar.ts');
		t.is(resolveRawInputPath('gro/foo/bar.ts'), groTarget);
		t.is(resolveRawInputPath('foo/bar.ts', fakePaths), join(fakeDir, 'src/foo/bar.ts'));
		t.is(resolveRawInputPath('gro/foo/bar.ts', fakePaths), join(fakeDir, 'src/gro/foo/bar.ts'));
		t.is(resolveRawInputPath('foo/bar.ts'), groTarget);
		t.is(resolveRawInputPath('foo/bar.ts', groPaths), groTarget);
		t.is(resolveRawInputPath('gro'), resolve('src') + sep);
	});

	test('directories', () => {
		const targetDir = resolve('src/foo/bar');
		t.is(resolveRawInputPath('foo/bar'), targetDir);
		t.is(resolveRawInputPath('foo/bar/'), targetDir + '/');
		t.is(resolveRawInputPath('src/foo/bar'), targetDir);
		t.is(resolveRawInputPath('src/foo/bar/'), targetDir + '/');
		t.is(resolveRawInputPath('./src/foo/bar'), targetDir);
		t.is(resolveRawInputPath('./src/foo/bar/'), targetDir + '/');
		t.isNot(resolveRawInputPath('bar'), targetDir);
	});
});

test('resolveRawInputPaths()', () => {
	t.equal(resolveRawInputPaths(['foo/bar.ts', 'baz', './']), [
		resolve('src/foo/bar.ts'),
		resolve('src/baz'),
		resolve('src') + sep,
	]);

	test('default to src', () => {
		t.equal(resolveRawInputPaths([]), [resolve('src') + sep]);
	});
});

test('getPossibleSourceIds()', () => {
	test('in the gro directory', () => {
		const inputPath = resolve('src/foo/bar');
		t.equal(getPossibleSourceIds(inputPath, ['.baz.ts']), [inputPath, inputPath + '.baz.ts']);
	});

	test('does not repeat the extension', () => {
		const inputPath = resolve('src/foo/bar.baz.ts');
		t.equal(getPossibleSourceIds(inputPath, ['.baz.ts']), [inputPath]);
	});

	test('does not repeat with the same root directory', () => {
		const inputPath = resolve('src/foo/bar.baz.ts');
		t.equal(getPossibleSourceIds(inputPath, ['.baz.ts'], [paths.root, paths.root]), [inputPath]);
	});

	test('implied to be a directory by trailing slash', () => {
		const inputPath = resolve('src/foo/bar') + sep;
		t.equal(getPossibleSourceIds(inputPath, ['.baz.ts']), [inputPath]);
	});

	test('in both another directory and gro', () => {
		const fakeDir = resolve('../fake') + sep;
		const fakePaths = createPaths(fakeDir);
		const inputPath = join(fakeDir, 'src/foo/bar');
		t.equal(getPossibleSourceIds(inputPath, ['.baz.ts'], [groPaths.root], fakePaths), [
			inputPath,
			inputPath + '.baz.ts',
			replaceRootDir(inputPath, groPaths.root, fakePaths),
			replaceRootDir(inputPath, groPaths.root, fakePaths) + '.baz.ts',
		]);
	});
});

test('loadSourcePathDataByInputPath()', async () => {
	const result = await loadSourcePathDataByInputPath(
		['fake/test1.bar.ts', 'fake/test2', 'fake/test3', 'fake/missing'],
		async (path) => path !== 'fake/test3.bar.ts' && !path.startsWith('fake/missing'),
		async (path) => ({
			isDirectory: () => path === 'fake/test2' || path === 'fake/test3',
		}),
		(inputPath) => getPossibleSourceIds(inputPath, ['.bar.ts']),
	);
	t.equal(result, {
		sourceIdPathDataByInputPath: new Map([
			['fake/test1.bar.ts', {id: 'fake/test1.bar.ts', isDirectory: false}],
			['fake/test2', {id: 'fake/test2.bar.ts', isDirectory: false}],
			['fake/test3', {id: 'fake/test3', isDirectory: true}],
		]),
		unmappedInputPaths: ['fake/missing'],
	});
});

test('loadSourceIdsByInputPath()', async () => {
	const testFiles: Obj<Map<string, PathStats>> = {
		'fake/test1.bar.ts': new Map([['fake/test1.bar.ts', {isDirectory: () => false}]]),
		'fake/test2.bar.ts': new Map([['fake/test2.bar.ts', {isDirectory: () => false}]]),
		'fake/test3': new Map([
			['fake/test3', {isDirectory: () => true}],
			['a.ts', {isDirectory: () => false}],
			['b.ts', {isDirectory: () => false}],
		]),
		// duplicate
		'fake/': new Map([
			['fake/test3', {isDirectory: () => true}],
			['test3/a.ts', {isDirectory: () => false}],
		]),
		// duplicate and not
		fake: new Map([
			['fake/test3', {isDirectory: () => true}],
			['test3/a.ts', {isDirectory: () => false}],
			['test3/c.ts', {isDirectory: () => false}],
		]),
		'fake/nomatches': new Map([['fake/nomatches', {isDirectory: () => true}]]),
	};
	const result = await loadSourceIdsByInputPath(
		new Map([
			['fake/test1.bar.ts', {id: 'fake/test1.bar.ts', isDirectory: false}],
			['fake/test2', {id: 'fake/test2.bar.ts', isDirectory: false}],
			['fake/test3', {id: 'fake/test3', isDirectory: true}],
			['fake/', {id: 'fake/', isDirectory: true}],
			['fake', {id: 'fake', isDirectory: true}],
			['fake/nomatches', {id: 'fake/nomatches', isDirectory: true}],
		]),
		async (id) => testFiles[id],
	);
	t.equal(result, {
		sourceIdsByInputPath: new Map([
			['fake/test1.bar.ts', ['fake/test1.bar.ts']],
			['fake/test2', ['fake/test2.bar.ts']],
			['fake/test3', ['fake/test3/a.ts', 'fake/test3/b.ts']],
			['fake', ['fake/test3/c.ts']],
		]),
		inputDirectoriesWithNoFiles: ['fake/nomatches'],
	});
});
