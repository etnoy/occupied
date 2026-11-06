# Anti-slop rules

Vendored from https://github.com/dmmulroy/anti-slop at the commit recorded in
`REVISION`. Production source and third-party notices are retained; upstream test
suites are not copied.

All 18 generic and five Effect rules run through both ESLint (including Svelte templates) and
Oxlint. The Effect rules are enabled to retain the complete ruleset, although
Occupied currently has no Effect dependency. Oxlint also enforces `oxc/no-accumulating-spread`. ESLint continues to own
existing type-aware, Svelte, Unicorn, and Prettier checks. Both lint commands are
part of `pnpm lint`; CI already runs that command. `pnpm lint:fix` runs both fixers
before rebuilding the committed frontend assets.

`no-runtime-typeof` uses the documented `allowInTypeGuards: true` option. HA/DOM
representation checks live in type predicates; application logic consumes those
contracts. Error callbacks use the upstream rule's explicit `cause` convention.
No generic rules are disabled for production code or test fixtures.

Local compatibility changes replace Oxlint-specific `start`/`end` offsets with
ESTree `range` offsets in the parameter, assertion, reducer, and widening helpers.
Both parsers supply ranges; this keeps the rules functional under ESLint's
TypeScript/Svelte parsers. Regression tests in `tests/frontend/src/lint.test.ts`
check Svelte enforcement and acceptance of documented assertions and guards.

Keep `oxlint` and `@oxlint/plugins` pinned to identical versions. On updates,
review upstream changes, preserve these compatibility edits, run `pnpm lint:fix`,
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, and
`pnpm build:check`. Preserve this directory's MIT license and the separate license
and provenance under `vendor/eslint-stylistic/`.
