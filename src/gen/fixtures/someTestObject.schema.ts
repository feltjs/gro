import type {JSONSchema} from '@ryanatkn/json-schema-to-typescript';

export const SomeTestObjectSchema: JSONSchema = {
	$id: 'https://grocode.org/schemas/SomeTestObject.json',
	type: 'object',
	properties: {
		a: {type: 'number'},
		b: {type: 'string'},
		c: {
			type: 'object',
			tsType: 'A',
			tsImport: `import type {A} from './someTestExports.js';`,
		},
		d: {
			type: 'object',
			tsType:
				'A<B<C<D<typeof E, B2,C2, C3, typeof F, typeof E22222222222222222, typeof E3, typeof E4, typeof json>>>>',
			tsImport: [
				` import type {A} from "./someTestExports.js" `,
				`import type {B, C} from "./someTestExports.js"`,
				`import  type {B as B2, C, C as C2} from "./someTestExports.js"  // hmm`,
				` import E ,  {type D,\ntype C as C3,\n E as E22222222222222222,\n  type  F\n} from "./someTestExports.js"  // hmm`,
				`import E3 from "./someTestExports2.js";`,
				`import type E4 from "./someTestExports3.js"`,
				`import "./someTestExports.js"; // this is long and preserved`, // should be removed
				`import "./someTestSideEffect.js"; // hmm`, // preserve side effects
				`import json from './someTestJson.json' assert { type: 'json' } // hmm`, // preserve assert
				`const a = await import('./asdf.js');`, // ignore dynamic
				`import  ('asdf', { assert: { type: 'json' }});`, // ignore inline dynamic
				`import.meta.asdf;`, // ignore `import.meta`
			],
		},
	},
	required: ['a', 'b'],
	additionalProperties: false,
};

export const SomeTestPrimitiveSchema = {
	$id: 'https://grocode.org/schemas/SomeTestPrimitive.json',
	type: 'number',
};
