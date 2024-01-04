# gro <img src="static/favicon.png" width="32" height="32">

<img src="static/favicon.png" align="right" width="192" height="192">

> task runner and toolkit extending SvelteKit - [grogarden.org](https://grogarden.org)

[`npm i -D @grogarden/gro`](https://www.npmjs.com/package/@grogarden/gro)

limitations:

- Gro has been actively used since 2019 but it has few users,
  so you'll likely encounter problems and undesirable limitations --
  please open issues!
- [Windows won't be supported](https://github.com/grogarden/gro/issues/319)

## about

Gro is a task runner and toolkit
extending [SvelteKit](https://github.com/sveltejs/kit),
[Vite](https://github.com/vitejs/vite),
and [esbuild](https://github.com/evanw/esbuild)
for making web frontends, servers, and libraries with TypeScript.
It includes:

- [task runner](/src/lib/docs/task.md) that uses the filesystem convention `*.task.ts`
  - lots of [common builtin tasks](/src/lib/docs/tasks.md) that users can easily override and compose
- tools and patterns for
  [developing](/src/lib/docs/dev.md),
  [building](/src/lib/docs/build.md),
  [testing](/src/lib/docs/test.md),
  [deploying](/src/lib/docs/deploy.md),
  and [publishing](/src/lib/docs/publish.md)
  [SvelteKit](https://github.com/sveltejs/kit) apps, library packages, and Node servers
  - integrated [TypeScript](https://github.com/microsoft/typescript),
    [Svelte](https://github.com/sveltejs/svelte),
    and [SvelteKit](https://github.com/sveltejs/kit)
  - defers to SvelteKit and Vite for the frontend and
    [`@sveltejs/package`](https://kit.svelte.dev/docs/packaging) for the library
  - uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs
  - provides a [Node loader](/src/lib/loader.ts) and
    [esbuild plugins for the server](/src/lib/gro_plugin_server.ts)
    - supports importing TypeScript, JSON, and SSR'd Svelte files in tests and tasks
    - supports [SvelteKit module imports](https://kit.svelte.dev/docs/modules) for
      `$lib`, `$env`, and `$app` in tasks, tests, Node servers,
      and other code outside of the SvelteKit frontend,
      so you can use SvelteKit patterns everywhere
      (these are best-effort shims, not perfect)
    - supports running TypeScript files directly without a task via `gro run a.ts`
  - [configurable plugins](/src/lib/docs/plugin.md)
    to support SvelteKit, auto-restarting Node servers, and other external build processes
    - see the [Gro config docs](/src/lib/docs/config.md) and
      [the default config](https://github.com/grogarden/gro/blob/main/src/lib/gro.config.default.ts)
    - see [`fuz_template`](https://github.com/fuz-dev/fuz_template)
      for a simple starter project example, and
      [`@feltjs/felt`](https://github.com/feltjs/felt) for a more complex example with custom tasks
- [testing](/src/lib/docs/test.md) with [`uvu`](https://github.com/lukeed/uvu)
- codegen by convention with [`gen`](/src/lib/docs/gen.md)
  - supports automatic type generation by convention with `.schema.` files
    using [JSON Schema](https://json-schema.org/) and
    [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript)
- linting with [ESLint](https://github.com/eslint/eslint)
  (I also maintain [`@feltjs/eslint-config`](https://github.com/feltjs/eslint-config))
- formatting with [Prettier](https://github.com/prettier/prettier)
  (it's not always pretty but it saves time writing and reading code,
  my time is more precious than my formatting style)

## docs

- developing web frontends, servers, and libraries
  - [config](/src/lib/docs/config.md)
  - [dev](/src/lib/docs/dev.md)
  - [build](/src/lib/docs/build.md) for production
  - [deploy](/src/lib/docs/deploy.md) to a branch, like for GitHub pages
  - [publish](/src/lib/docs/publish.md) to npm
- [`Task`](/src/lib/docs/task.md) runner
  - builtin [tasks](/src/lib/docs/tasks.md) list
- [testing](/src/lib/docs/test.md) with [`uvu`](https://github.com/lukeed/uvu)
- [`gen`](/src/lib/docs/gen.md) code generation
- [`public` package](/src/lib/docs/package_json.md#public-packages) features (nonstandard)
- full [docs index](/src/lib/docs#readme)

## install

> depends on node >=20.10

Typical usage installs [@grogarden/gro](https://www.npmjs.com/package/@grogarden/gro)
as a dev dependency:

```bash
npm i -D @grogarden/gro
npx gro
```

It's handy to install globally too:

```bash
npm i -g @grogarden/gro
gro
```

## usage

Gro has a task runner that discovers and runs TypeScript modules with the `.task.` subextension.
Running `gro` with no args prints the tasks
it finds in the current directory along with its builtin tasks:

```bash
gro # prints available tasks - defers to any local gro installation
```

```
Run a task: gro [name]
View help:  gro [name] --help

17 tasks in gro:

build      build the project
changeset  call changeset with gro patterns
check      check that everything is ready to commit
clean      remove temporary dev and build files, and optionally prune git branches
commit     commit and push to a new branch
deploy     deploy to a branch
dev        start SvelteKit and other dev plugins
exports    write the "exports" property of package.json and copy the file to .well-known
format     format source files
gen        run code generation scripts
lint       run eslint
publish    bump version, publish to npm, and git push
release    publish and deploy
sync       run `gro gen`, `gro exports`, and optionally `npm i` to sync up
test       run tests with uvu
typecheck  run tsc on the project without emitting any files
upgrade    upgrade deps
```

Gro matches your CLI input against its filesystem conventions.
It tries to do the right thing, where right is helpful but not surprising,
with some magic but not too much:

```bash
gro # print all available tasks, those matching `src/lib/**/*.task.ts` and Gro's builtins
gro some/dir # list all tasks inside `src/lib/some/dir`
gro some/file # run `src/lib/some/file.task.ts`
gro some/file.task.ts # same as above
gro a # run `src/lib/a.task.ts` if it exists, falling back to Gro's builtin
gro a --help # print info about the "a" task; works for every task
```

Gro has a number of builtin tasks that you can run with the CLI.
To learn more [see the task docs](/src/lib/docs/task.md)
and [the generated task index](/src/lib/docs/tasks.md).

```bash
gro dev # start developing in watch mode
gro dev -- vite --port 3003 # forward args by separating sections with --
```

```bash
gro build # build everything for production
```

[Testing](/src/lib/docs/test.md) with [`uvu`](https://github.com/lukeed/uvu),
including shims for [SvelteKit modules](https://kit.svelte.dev/docs/modules):

```bash
gro test # run all tests for `*.test.ts` files with `uvu`
gro test filepattern1 some.test another.test
gro test -- uvu --forwarded_args 'to uvu'
```

Check all the things:

```bash
gro check # does all of the following:
gro typecheck # typecheck JS/TypeScript and Svelte
gro test # run tests
gro gen --check # ensure generated files are current
gro format --check # ensure everything is formatted
gro lint # eslint
```

For a usage example see [the `check.yml` CI config](.github/workflows/check.yml).

Formatting with [`prettier`](https://github.com/prettier/prettier):

```bash
gro format # format all of the source files using Prettier
gro format --check # check that all source files are formatted
```

Codegen with [`gen`](/src/lib/docs/gen.md):

```bash
gro gen # run codegen for all `*.gen.*` files
gro gen --check # error if any generated files are new or different
```

To deploy: (also see [`src/lib/docs/deploy.md`](/src/lib/docs/deploy.md))

```bash
gro deploy # build and push to the `deploy` branch
```

To publish: (also see [`src/lib/docs/publish.md`](/src/lib/docs/publish.md))

```bash
gro publish # flush changeset to changelog, bump version, publish to npm, and git push
```

Etc:

```bash
gro clean # delete all build artifacts from the filesystem
gro clean --sveltekit --nodemodules --git # also deletes dirs and prunes git branches
gro upgrade excluded-dep-1 excluded-dep-2 # npm updates to the latest everything
```

```bash
gro --version # print the Gro version
```

For more see [`src/lib/docs/task.md`](/src/lib/docs/task.md) and [`src/lib/docs`](/src/lib/docs).

## develop

```bash
npm i
npm run build # build and link `gro` - needed only once
gro build # same as `npm run build` when the `gro` CLI is available
gro test # make sure everything looks good - same as `npm test`
gro test some.test another.test

# use your development version of `gro` locally in another project:
gro build # updates the `gro` CLI, same as `npm run build`
cd ../otherproject
npm link ../gro # from `otherproject/`
gro build # from `../gro` on changes
```

## credits 🐢<sub>🐢</sub><sub><sub>🐢</sub></sub>

Gro builds on
[TypeScript](https://github.com/microsoft/TypeScript) ∙
[Svelte](https://github.com/sveltejs/svelte) ∙
[SvelteKit](https://github.com/sveltejs/kit) ∙
[Vite](https://github.com/vitejs/vite) ∙
[esbuild](https://github.com/evanw/esbuild) ∙
[uvu](https://github.com/lukeed/uvu) ∙
[mri](https://github.com/lukeed/mri) ∙
[chokidar](https://github.com/paulmillr/chokidar) ∙
[zod](https://github.com/colinhacks/zod) ∙
[@grogarden/util](https://github.com/grogarden/util) ∙
[ESLint](https://github.com/eslint/eslint) ∙
[Prettier](https://github.com/prettier/prettier) ∙
[svelte-check](https://github.com/sveltejs/language-tools/tree/master/packages/svelte-check) ∙
[JSON Schema](https://json-schema.org/) ∙
[json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript) &
[more](package.json)

## license [🐦](https://wikipedia.org/wiki/Free_and_open-source_software)

[MIT](LICENSE)
