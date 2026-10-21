# Frontend

The Svelte 5 panel follows Immich's `web/src/lib` layout, adapted to a Home
Assistant custom panel. Home Assistant provides navigation and the runtime host.

```text
src/
  occupied-panel.ts       Home Assistant custom element and backend controller
  App.svelte             Panel shell and view selection
  app.css                Shared styles injected into the panel's shadow root
  assets.d.ts            Stylesheet module declarations
  events.d.ts            Home Assistant event declarations for Svelte
  lib/
    components/
      steps/             Step list, editor, actions, and dialogs
      random/            Random event list, editor, actions, and dialogs
      preview/           Schedule timeline and live preview controls
      settings/          Program settings and YAML editor
      shared/            Reusable editor fields, pickers, and dialogs
    actions/             Svelte actions for DOM properties and events
    controllers/         Editor and preview orchestration
    models/              Program, step, and random event editing models
    services/            Home Assistant controls and subscription lifecycle
    i18n/                Translations
    utils/               Shared validation, timing, and projection helpers
    types.ts             Shared frontend and backend API types
dist/                    Committed JavaScript installed by Home Assistant/HACS
```

Keep feature components together and put reusable UI in `components/shared`.
Models and utilities remain independent of Svelte rendering. Frontend sources use
relative imports; tests use `@occupied/*`, which resolves to `src/*` for type
checking and to the corresponding committed `dist/*` modules when compiled.

Step and random activity lists default to chronological start-time order. Relative
sources include their offsets; solar sources use Home Assistant's current sun
times, with approximate daily times as a fallback. Unresolved sources appear last.
Steps remain nested beneath the step they depend on. Chronological sorting and
manual moves apply within each group of siblings; moving a parent carries its
dependent steps with it.
Drag the left handle (or use its arrow keys) to set a manual order, and use Reset
to chronological to restore automatic sorting. Manual orders are browser-local,
stored separately for each controller and activity list; they do not alter the
program or its execution order.

Run the frontend commands from the repository root. `pnpm run build` discovers
TypeScript modules recursively and mirrors their paths under `dist/`, bundling
the Svelte UI and CSS into `dist/occupied-panel.js`. Commit generated assets with
source changes. `pnpm run build:check` verifies them without rewriting files;
`pnpm test` builds only test output and exercises the committed modules.

Panel program state is optional until loading completes and becomes undefined again on unload or controller switching. Views and editor controllers that need a loaded program use `LoadedOccupiedPanel`, after the `hasProgram` guard checks draft, saved program and document together. Keep the existing epoch checks across asynchronous work: a controller can unload while a request is pending.

The panel refreshes controller discovery and subscriptions after a websocket
reconnect, including when Home Assistant reuses the connection object. Relevant
entity availability changes trigger a debounced background catalog and warning
refresh without replacing drafts, editors, YAML, or the selected tab. Temporary
startup failures retry with exponential backoff capped at 30 seconds; listeners,
timers, and late responses are scoped to the mounted panel and selected controller.
