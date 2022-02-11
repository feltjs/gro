import {type ArgsSchema} from './utils/args.js';

export const TypecheckTaskArgsSchema: ArgsSchema = {
	$id: '/schemas/TypecheckTaskArgs.json',
	type: 'object',
	properties: {
		tsconfig: {type: 'string', default: 'tsconfig.json', description: 'path to tsconfig.json'},
	},
	required: ['tsconfig'],
	additionalProperties: false,
};
