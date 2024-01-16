// shim for $app/paths
// @see https://github.com/sveltejs/kit/issues/1485

/**
 * This file is created dynamically by `render_sveltekit_shim_app_paths`
 * but exists here for the sake of the Node loader.
 * There may be a cleaner workaround but I couldn't find it.
 * @see https://github.com/nodejs/loaders for details about the forthcoming virtual file support
 */

import type {resolveRoute as base_resolveRoute} from '$app/paths';
import {noop} from '@ryanatkn/belt/function.js';

export const assets = '';
export const base = '';
export const resolveRoute: typeof base_resolveRoute = noop;
