# Gro changelog

## 0.5.0

- change the `build/` directory to `.gro/` and support multiple builds
  ([#59](https://github.com/feltcoop/gro/pull/59))
- add support for a config file at `src/gro.config.ts` for custom builds
  ([#67](https://github.com/feltcoop/gro/pull/67),
  [#68](https://github.com/feltcoop/gro/pull/68),
  [#82](https://github.com/feltcoop/gro/pull/82),
  [#83](https://github.com/feltcoop/gro/pull/83))
- add `Filer` to replace `CachingCompiler` with additional filesystem capabilities
  ([#54](https://github.com/feltcoop/gro/pull/54),
  [#55](https://github.com/feltcoop/gro/pull/55),
  [#58](https://github.com/feltcoop/gro/pull/58),
  [#60](https://github.com/feltcoop/gro/pull/60),
  [#62](https://github.com/feltcoop/gro/pull/62),
  [#63](https://github.com/feltcoop/gro/pull/63))
- add Svelte compilation to the unbundled compilation strategies
  ([#52](https://github.com/feltcoop/gro/pull/52),
  [#56](https://github.com/feltcoop/gro/pull/56),
  [#65](https://github.com/feltcoop/gro/pull/65),
  [#66](https://github.com/feltcoop/gro/pull/66))
- bundle external modules for the browser
  ([#61](https://github.com/feltcoop/gro/pull/61),
  [#71](https://github.com/feltcoop/gro/pull/71),
  [#76](https://github.com/feltcoop/gro/pull/76),
  [#81](https://github.com/feltcoop/gro/pull/81))
- make `createBuilder` pluggable allowing users to provide a compiler for each file
  ([#57](https://github.com/feltcoop/gro/pull/57))
- rename `compiler` to `builder`
  ([#70](https://github.com/feltcoop/gro/pull/70))
- replace deep equality helpers with `dequal`
  ([#73](https://github.com/feltcoop/gro/pull/73))
- add a basic client to view project data
  ([#86](https://github.com/feltcoop/gro/pull/86))
- add server caching
  ([#77](https://github.com/feltcoop/gro/pull/77))

## 0.4.0

- add `swc` dependency along with a Rollup plugin and Svelte preprocessor
  ([#45](https://github.com/feltcoop/gro/pull/45))
- add the `compile` task and use `swc` for non-watchmode builds
  ([#46](https://github.com/feltcoop/gro/pull/46))
- add `CachingCompiler` which uses `swc` to replace `tsc` watchmode
  ([#51](https://github.com/feltcoop/gro/pull/51))
- add stop function return value to `Timings#start`
  ([#47](https://github.com/feltcoop/gro/pull/47))
- rename identifiers from "ext" to "extension" to follow newer convention
  ([#48](https://github.com/feltcoop/gro/pull/48))
- convert `AssertionOperator` from an enum to a union of string types
  ([#49](https://github.com/feltcoop/gro/pull/49))
- rename `AsyncState` to `AsyncStatus` and convert it from an enum to a union of string types
  ([#50](https://github.com/feltcoop/gro/pull/50))

## 0.3.0

- handle build errors in the deploy task and add the `--dry` deploy flag
  ([#42](https://github.com/feltcoop/gro/pull/42))
- update dependencies
  ([#43](https://github.com/feltcoop/gro/pull/43),
  [#44](https://github.com/feltcoop/gro/pull/44))

## 0.2.12

- fix log message when listing all tasks
  ([#41](https://github.com/feltcoop/gro/pull/41))

## 0.2.11

- change the deploy task to delete `dist/` when done to avoid git worktree issues
  ([#40](https://github.com/feltcoop/gro/pull/40))

## 0.2.10

- add a default `gro deploy` task for gh-pages
  ([#39](https://github.com/feltcoop/gro/pull/39))
- run the clean task at the beginning of the check task
  ([#37](https://github.com/feltcoop/gro/pull/37))

## 0.2.9

- sort CSS builds to make output deterministic
  ([#36](https://github.com/feltcoop/gro/pull/36))

## 0.2.8

- make Rollup build extensible
  ([#35](https://github.com/feltcoop/gro/pull/35))
- upgrade peer dependencies
  ([#34](https://github.com/feltcoop/gro/pull/34))

## 0.2.7

- enable sourcemaps for build in development mode
  ([#33](https://github.com/feltcoop/gro/pull/33))

## 0.2.6

- add `uuid` utilities
  ([#31](https://github.com/feltcoop/gro/pull/31))

## 0.2.5

- add `randomFloat` utility
  ([#30](https://github.com/feltcoop/gro/pull/30))

## 0.2.4

- add `Result` type helper to `src/globalTypes.ts`
  ([#29](https://github.com/feltcoop/gro/pull/29))

## 0.2.3

- fix external module type declarations by merging
  `src/project/globalTypes.d.ts` into `src/globalTypes.ts`
  ([#28](https://github.com/feltcoop/gro/pull/28))

## 0.2.2

- export `kleur/colors` from `src/colors/terminal.js`
  ([#27](https://github.com/feltcoop/gro/pull/27))

## 0.2.1

- add type helpers `Branded` and `Flavored` for nominal-ish typing
  ([#23](https://github.com/feltcoop/gro/pull/23))

## 0.2.0

- **breaking:** upgrade `kleur` dep and remove color wrappers
  ([#26](https://github.com/feltcoop/gro/pull/26))

## 0.1.14

- correctly fix `.js` module resolution where
  [#24](https://github.com/feltcoop/gro/pull/24) failed
  ([#25](https://github.com/feltcoop/gro/pull/25))

## 0.1.13

- change assertions `t.is` and `t.equal` to use a shared generic type for extra safety
  ([#22](https://github.com/feltcoop/gro/pull/22))
- fix `.js` module resolution in the Rollup TypeScript plugin
  ([#24](https://github.com/feltcoop/gro/pull/24))

## 0.1.12

- add the `invokeTask` helper for task composition
  ([#20](https://github.com/feltcoop/gro/pull/20))
- add CLI flags to print the Gro version with `--version` or `-v`
  ([#21](https://github.com/feltcoop/gro/pull/21))

## 0.1.11

- fix `terser` import
- export `Unobtain` type from `utils/createObtainable.ts`

## 0.1.10

- add async `rejects` assertion
  ([#19](https://github.com/feltcoop/gro/pull/19))
- change the check task to run tests only if some exist
  ([#18](https://github.com/feltcoop/gro/pull/18))

## 0.1.9

- actually fix unbuilt project detection when invoking builtin Gro tasks
  ([#17](https://github.com/feltcoop/gro/pull/17))

## 0.1.8

- fix unbuilt project detection when invoking builtin Gro tasks
  ([#16](https://github.com/feltcoop/gro/pull/16))

## 0.1.7

- compile TypeScript if an invoked task cannot be found in `build/`
  ([#12](https://github.com/feltcoop/gro/pull/12))
- change the check task to look for stale generated files only if the project contains gen files
  ([#13](https://github.com/feltcoop/gro/pull/13))
- format files in the root directory, not just `src/`
  ([#15](https://github.com/feltcoop/gro/pull/15))

## 0.1.6

- change `gro clean` to delete directories instead of emptying them
  ([#11](https://github.com/feltcoop/gro/pull/11))

## 0.1.5

- add `gro format` and `gro format --check` and format generated code
  ([#8](https://github.com/feltcoop/gro/pull/8))
- add `prettier` and `prettier-plugin-svelte` as peer dependencies and upgrade to Prettier 2
  ([#8](https://github.com/feltcoop/gro/pull/8))

## 0.1.4

- ensure the project has been built when invoking tasks
  ([#5](https://github.com/feltcoop/gro/pull/5))

## 0.1.3

- upgrade TypeScript minor version
- rename `utils/random.ts` functions, expanding "rand" prefix to "random"

## 0.1.2

- upgrade TypeScript dep
- add `utils/createObtainable.ts` for decoupled lifecycle management

## 0.1.1

- add `fs/watchNodeFs.ts` for low level filesystem watching
- expose `remove` and `ensureDir` in `fs/nodeFs.ts`

## 0.1.0

- plant in the ground
