import {test, t} from '../oki/oki.js';
import {normalizeBuildConfigs, validateBuildConfigs} from './buildConfig.js';

test('normalizeBuildConfigs()', async () => {
	test('normalizes undefined to a default config', () => {
		const buildConfig = normalizeBuildConfigs(undefined);
		t.equal(buildConfig, [
			{name: 'node', platform: 'node', primary: true, dist: true, include: null},
		]);
	});

	test('normalizes an empty array to a default config', () => {
		const buildConfig = normalizeBuildConfigs([]);
		t.equal(buildConfig, [
			{name: 'node', platform: 'node', primary: true, dist: true, include: null},
		]);
	});

	test('normalizes a plain config', () => {
		const buildConfig = normalizeBuildConfigs([{name: 'node', platform: 'node'}]);
		t.equal(buildConfig, [
			{name: 'node', platform: 'node', primary: true, dist: true, include: null},
		]);
	});

	test('ensures a node config', () => {
		const buildConfig = normalizeBuildConfigs([
			{name: 'browser', platform: 'browser', primary: true, dist: true},
		]);
		t.equal(buildConfig, [
			{name: 'browser', platform: 'browser', primary: true, dist: true, include: null},
			{name: 'node', platform: 'node', primary: true, dist: false, include: null},
		]);
	});

	test('declares a single dist', () => {
		const buildConfig = normalizeBuildConfigs([
			{name: 'node1', platform: 'node'},
			{name: 'node2', platform: 'node', dist: true},
			{name: 'node3', platform: 'node', primary: true},
		]);
		t.equal(buildConfig, [
			{name: 'node1', platform: 'node', primary: false, dist: false, include: null},
			{name: 'node2', platform: 'node', primary: false, dist: true, include: null},
			{name: 'node3', platform: 'node', primary: true, dist: false, include: null},
		]);
	});

	test('ensures a primary config for each platform', () => {
		const buildConfig = normalizeBuildConfigs([
			{name: 'node1', platform: 'node', primary: false, dist: true},
			{name: 'node2', platform: 'node', primary: false},
			{name: 'browser1', platform: 'browser', primary: false},
			{name: 'browser2', platform: 'browser', primary: false},
			{name: 'browser3', platform: 'browser', primary: false},
		]);
		t.equal(buildConfig, [
			{name: 'node1', platform: 'node', primary: true, dist: true, include: null},
			{name: 'node2', platform: 'node', primary: false, dist: false, include: null},
			{name: 'browser1', platform: 'browser', primary: true, dist: false, include: null},
			{name: 'browser2', platform: 'browser', primary: false, dist: false, include: null},
			{name: 'browser3', platform: 'browser', primary: false, dist: false, include: null},
		]);
	});

	test('makes all dist when none is', () => {
		const buildConfig = normalizeBuildConfigs([
			{name: 'node1', platform: 'node', dist: false},
			{name: 'node2', platform: 'node', dist: false},
			{name: 'node3', platform: 'node'},
			{name: 'browser1', platform: 'browser', dist: false},
			{name: 'browser2', platform: 'browser'},
		]);
		t.equal(buildConfig, [
			{name: 'node1', platform: 'node', primary: true, dist: true, include: null},
			{name: 'node2', platform: 'node', primary: false, dist: true, include: null},
			{name: 'node3', platform: 'node', primary: false, dist: true, include: null},
			{name: 'browser1', platform: 'browser', primary: true, dist: true, include: null},
			{name: 'browser2', platform: 'browser', primary: false, dist: true, include: null},
		]);
	});

	test('throws without an array', () => {
		t.throws(() => normalizeBuildConfigs({name: 'node', platform: 'node'} as any));
	});
});

test('validateBuildConfigs', () => {
	validateBuildConfigs(normalizeBuildConfigs([{name: 'node', platform: 'node'}]));
	validateBuildConfigs(
		normalizeBuildConfigs([
			{name: 'node', platform: 'node', dist: true},
			{name: 'node2', platform: 'node', primary: true},
			{name: 'browser', platform: 'browser'},
			{name: 'browser2', platform: 'browser'},
		]),
	);
	validateBuildConfigs(
		normalizeBuildConfigs([
			{name: 'node', platform: 'node'},
			{name: 'node2', platform: 'node', primary: true},
			{name: 'browser', platform: 'browser'},
			{name: 'browser2', platform: 'browser', primary: true},
		]),
	);

	test('fails with undefined', () => {
		t.ok(!validateBuildConfigs(undefined as any).ok);
		t.ok(!validateBuildConfigs({name: 'node', platform: 'node'} as any).ok);
	});

	test('fails with an invalid name', () => {
		t.ok(!validateBuildConfigs(normalizeBuildConfigs([{platform: 'node'} as any])).ok);
		t.ok(!validateBuildConfigs(normalizeBuildConfigs([{name: '', platform: 'node'}])).ok);
	});

	test('fails with a primary Node name that does not match the enforced default', () => {
		t.ok(
			!validateBuildConfigs(
				normalizeBuildConfigs([{name: 'failing_custom_name', platform: 'node'}]),
			).ok,
		);
		t.ok(
			!validateBuildConfigs(
				normalizeBuildConfigs([
					{name: 'node', platform: 'node'},
					{name: 'failing_custom_name', platform: 'node', primary: true},
				]),
			).ok,
		);
	});

	test('fails with duplicate names', () => {
		t.ok(
			!validateBuildConfigs(
				normalizeBuildConfigs([
					{name: 'node', platform: 'node'},
					{name: 'node', platform: 'node'},
				]),
			).ok,
		);
		t.ok(
			!validateBuildConfigs(
				normalizeBuildConfigs([
					{name: 'node', platform: 'node'},
					{name: 'node', platform: 'browser'},
				]),
			).ok,
		);
	});

	test('fails with multiple primary configs for the same platform ', () => {
		t.ok(
			!validateBuildConfigs(
				normalizeBuildConfigs([
					{name: 'node', platform: 'node'},
					{name: 'node2', platform: 'node', primary: true},
					{name: 'browser', platform: 'browser', primary: true},
					{name: 'node3', platform: 'node', primary: true},
				]),
			).ok,
		);
		t.ok(
			!validateBuildConfigs(
				normalizeBuildConfigs([
					{name: 'node', platform: 'node'},
					{name: 'browser1', platform: 'browser', primary: true},
					{name: 'browser2', platform: 'browser'},
					{name: 'browser3', platform: 'browser', primary: true},
				]),
			).ok,
		);
	});

	test('fails with an invalid platform', () => {
		t.ok(!validateBuildConfigs(normalizeBuildConfigs([{name: 'node'} as any])).ok);
		t.ok(
			!validateBuildConfigs(normalizeBuildConfigs([{name: 'node', platform: 'deno'} as any])).ok,
		);
	});
});
