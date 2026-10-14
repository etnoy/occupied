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

Run the frontend commands from the repository root. `pnpm run build` discovers
TypeScript modules recursively and mirrors their paths under `dist/`, bundling
the Svelte UI and CSS into `dist/occupied-panel.js`. Commit generated assets with
source changes. `pnpm run build:check` verifies them without rewriting files;
`pnpm test` builds only test output and exercises the committed modules.
