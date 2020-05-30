import {deepEqual} from '../utils/deepEqual.js';
import {ErrorClass} from '../utils/error.js';

export class AssertionError extends Error {
	constructor(public readonly assertion: FailedAssertion, message?: string) {
		super(message || `Assertion failed: ${assertion.operator}`);
	}
}

export const ok: (value: any) => asserts value = (value) => {
	if (!value) {
		throw new AssertionError({operator: AssertionOperator.ok, value});
	}
};

export const is = <T>(actual: T, expected: T): void => {
	if (!Object.is(actual, expected)) {
		throw new AssertionError({operator: AssertionOperator.is, actual, expected});
	}
};

export const isNot = (actual: any, expected: any): void => {
	if (Object.is(actual, expected)) {
		throw new AssertionError({operator: AssertionOperator.isNot, actual, expected});
	}
};

export const equal = <T>(actual: T, expected: T): void => {
	if (!deepEqual(actual, expected)) {
		throw new AssertionError({operator: AssertionOperator.equal, actual, expected});
	}
};

export const notEqual = (actual: any, expected: any): void => {
	if (deepEqual(actual, expected)) {
		throw new AssertionError({operator: AssertionOperator.notEqual, actual, expected});
	}
};

export const throws = (cb: () => void, matcher?: ErrorClass | RegExp | string): void => {
	try {
		cb();
	} catch (error) {
		if (matcher !== undefined && !matchError(matcher, error)) {
			throw new AssertionError({operator: AssertionOperator.throws, matcher, error});
		}
		return;
	}
	throw new AssertionError({operator: AssertionOperator.throws, matcher, error: null});
};

export const rejects = async (
	cbOrPromise: Promise<any> | (() => Promise<void>),
	matcher?: ErrorClass | RegExp | string,
): Promise<void> => {
	try {
		const promise = typeof cbOrPromise === 'function' ? cbOrPromise() : cbOrPromise;
		await promise;
	} catch (error) {
		if (matcher !== undefined && !matchError(matcher, error)) {
			throw new AssertionError({operator: AssertionOperator.rejects, matcher, error});
		}
		return;
	}
	throw new AssertionError({operator: AssertionOperator.rejects, matcher, error: null});
};

export const matchError = (matcher: ErrorClass | RegExp | string, error: Error): boolean => {
	if (typeof matcher === 'string') {
		return error.message.includes(matcher);
	} else if (matcher instanceof RegExp) {
		return matcher.test(error.message);
	}
	return error instanceof matcher;
};

export const fail = (message: string): never => {
	throw new TestFailureError(message);
};

export class TestFailureError extends AssertionError {
	constructor(message: string) {
		super({operator: AssertionOperator.fail, message}, message);
	}
}

/*

These need to be explicitly typed because of
TypeScript's `asserts` constraints.
See this error:
	`Assertions require every name in the call target to be declared
	with an explicit type annotation.ts(2775)`

*/
export type Assertions = {
	ok: typeof ok;
	is: typeof is;
	isNot: typeof isNot;
	equal: typeof equal;
	notEqual: typeof notEqual;
	throws: typeof throws;
	rejects: typeof rejects;
	fail: typeof fail;
	Error: typeof TestFailureError;
};
export const t: Assertions = {
	ok,
	is,
	isNot,
	equal,
	notEqual,
	throws,
	rejects,
	fail,
	Error: TestFailureError,
};

export enum AssertionOperator {
	ok = 'ok', // truthy
	is = 'is', // Object.is
	isNot = 'isNot', // !Object.is
	equal = 'equal', // deeply equal
	notEqual = 'notEqual', // !deeply equal
	throws = 'throws', // expects `cb` to throw an error that matches optional `matcher`
	rejects = 'rejects', // expects `cbOrPromise` to throw an error that matches optional `matcher`
	fail = 'fail', // throws an error
}

export type FailedAssertion =
	| FailedAssertionOk
	| FailedAssertionIs
	| FailedAssertionIsNot
	| FailedAssertionEqual
	| FailedAssertionNotEqual
	| FailedAssertionThrows
	| FailedAssertionRejects
	| FailedAssertionFail;
export type FailedAssertionOk = {
	operator: AssertionOperator.ok;
	value: any;
};
export type FailedAssertionIs = {
	operator: AssertionOperator.is;
	expected: any;
	actual: any;
};
export type FailedAssertionIsNot = {
	operator: AssertionOperator.isNot;
	expected: any;
	actual: any;
};
export type FailedAssertionEqual = {
	operator: AssertionOperator.equal;
	expected: any;
	actual: any;
};
export type FailedAssertionNotEqual = {
	operator: AssertionOperator.notEqual;
	expected: any;
	actual: any;
};
export type FailedAssertionThrows = {
	operator: AssertionOperator.throws;
	matcher: ErrorClass | RegExp | string | undefined;
	error: Error | null;
};
export type FailedAssertionRejects = {
	operator: AssertionOperator.rejects;
	matcher: ErrorClass | RegExp | string | undefined;
	error: Error | null;
};
export type FailedAssertionFail = {
	operator: AssertionOperator.fail;
	message: string;
};
