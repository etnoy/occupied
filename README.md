# Occupied

<img src="https://raw.githubusercontent.com/etnoy/occupied/main/media/occupied.svg" alt="Logo, a smiling occupied toilet sign" height="200">

Occupied manages selected Home Assistant entities using schedules, optional randomness and activation conditions. Use Home Assistant scenes for reusable sets of device states. Create separate controllers for devices with different rules: one can manage window lights each evening, while another manages ceiling lights only when the alarm is armed.

It is the spiritual successor of https://github.com/acockburn/occusim

A native Home Assistant occupancy simulator with shared GUI/YAML steps and random events, and deterministic daily planning.

Create a controller through **Settings → Devices & services → Add integration → Occupied**, then select **Configure**. Permission starts disabled. The editor creates steps with absolute start windows or relative timing, and a light/switch, scene, native entity service action, or Custom YAML block. Titles are optional. All weekdays and enabled state are implicit defaults. Choose **Custom YAML** to edit individual light/switch/cover states or combine actions in one block; switching from simple controls generates the corresponding YAML. See [Custom YAML actions](docs/custom-yaml.md).

**Staggered action** in **Advanced settings** applies light/switch on or off actions one entity at a time, at evenly spaced ticks in a newly shuffled order—Factorio style. It is off by default; the editable **Time window** defaults to `2m`. You can also set `stagger.period` through [Custom YAML](docs/custom-yaml.md#staggered-action). See the [example](examples/stagger.yaml).

Use the separate **Random** tab for repeated activity: choose a start/end window, a number of occurrences with an optional maximum, a duration range, and actions for each occurrence's start and end. The count is fixed unless a maximum is added; ranges choose a count between the inclusive bounds for each window. A zero minimum allows windows with no activity (`count: {min: 0, max: 1}` gives an equal chance of zero or one occurrence); a fixed zero always skips. Zero-occurrence windows also skip dependent random windows, with the choice preserved by seeded sampling. Duration bounds take precedence over the count: events may overlap, but are never shortened below the minimum, and a window that cannot fit one minimum-length event is infeasible when a positive count is sampled. Window starts can follow clock times, steps, solar events, Home Assistant time sources, or another random window’s closing time. Window ends use absolute time or a fixed/ranged duration from the sampled start. End actions reuse the selected entities by default. Random events appear alongside steps in Preview and in YAML exports.

```yaml
schema_version: 1
name: Occupied
steps:
  evening:
    timing:
      absolute_time: {start: '18:00', end: '18:30'}
    action: turn_on
    entities: [light.living_room]
  bedtime:
    timing:
      relative_to: {step: evening, start_offset: 2h}
    action: turn_off
    entities: [light.living_room]
```

HA supplies timezone/location, and its controls or automations determine management permission, pause, and dry run. There are no routine containers or managed-light lists. Initial planned state stays Unknown until an explicit action establishes intent. Gentle handover reconciles known light state; manual control yields an entity until the next activation. Generic services and scenes remain opaque.

GUI storage, YAML snapshots, and authoritative managed files share the same schema. Invalid managed-file updates retain the last valid program. Multiple controllers have independent plans, queues, permissions, and sources.

See [installation](docs/installation.md), [editor](docs/editor.md), [schema](docs/schema.md), [runtime](docs/runtime.md), and [managed configuration](docs/managed-configuration.md). Example programs are in [examples](examples/house.yaml).

See [Occupied and Presence Simulation](docs/presence-simulation-comparison.md) for when to choose authored schemes or history replay, how to use both, and possible additions to Occupied.

The standalone `occupied-config` CLI validates, exports, previews, and renames typed step IDs without importing Home Assistant or executing device services:

```sh
occupied-config validate examples/house.yaml --date 2026-10-13 --days 7 --timezone Europe/Stockholm --latitude 59.3 --longitude 18.1
occupied-config preview examples/house.yaml --date 2026-10-13 --seed preview --timezone Europe/Stockholm --latitude 59.3 --longitude 18.1
occupied-config export examples/house.yaml
occupied-config rename-id examples/house.yaml step wake_up morning
```

## Development and verification

Use [mise](https://mise.jdx.dev/) with Python's built-in virtual environment
and pip; uv is optional:

```sh
mise trust
mise install
mise exec -- python -m ensurepip --upgrade
mise exec -- python -m pip install --upgrade pip
mise exec -- python -m pip install -e . --group dev
pnpm install --frozen-lockfile --ignore-scripts
mise test
pnpm run build
mise lint
mise format
```

`mise test` runs pytest and accepts
additional arguments, for example `mise test tests/test_planner.py`. The setup commands
install the dependencies declared in `pyproject.toml`; pip does not reproduce the
exact dependency versions in `uv.lock`.
`mise lint` runs Ruff, ESLint on TypeScript sources and Svelte scripts/templates, and strict TypeScript/Svelte type
checks; `mise format` checks Ruff and Prettier formatting. Use `mise lint-fix` and
`mise format-fix` to apply automatic fixes and rebuild generated frontend files. Install the
Node development dependencies with `pnpm install --frozen-lockfile --ignore-scripts` before running these tasks.
Home Assistant itself depends on the `uv` Python package, so pip installs it inside
the virtual environment even though these development commands use mise and pip.

For the locked environment used by CI, install [uv](https://docs.astral.sh/uv/) and run:

```sh
uv sync --python 3.14 --locked
uv run pytest
uv run ruff check custom_components tests scripts
uv run ruff format --check custom_components tests scripts
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build:check
pnpm run lint
pnpm run typecheck
pnpm run format:check
pnpm test
uv run python scripts/check_release.py
```

The frontend uses Svelte 5 and TypeScript, with `OccupiedPanel` as HA’s custom element and backend controller. HTML lives in `.svelte` components, using template blocks for conditionals and lists. The panel shell, step editor, source picker, and timeline have separate components; model and validation logic remain independent of rendering. Preview orchestration lives in `preview-controller.ts`; subscription lifecycle guards live in `subscription.ts`. The editor requires Home Assistant and loads its native selectors and picker before rendering. A small DOM bridge passes object properties and custom events to those HA elements. Controller updates use Svelte's `flushSync` so editor actions can immediately focus newly rendered fields. TypeScript 6 is pinned for compatibility with `svelte-check`'s TypeScript API; strict checks cover both TypeScript and Svelte sources.

Frontend style uses two-space indentation and Prettier's 80-column wrapping. Separate imports from code, declarations and methods from their neighbors, and logical sections with blank lines. In Svelte scripts, group imports, props, state, derived values, and handlers; keep conditional/list bodies on separate lines and key repeated elements. Move complex label expressions into named helpers. Shared CSS lives in `styles.css` and is injected into the panel's shadow root; keep related selectors together and preserve cascade order. Run `pnpm run lint:fix` for automatic lint/spacing fixes and `pnpm run format:fix` for formatting; both rebuild the shipped assets.

Run `pnpm run build` after editing `.ts`, `.svelte`, or `.css` files and commit the generated `custom_components/occupied/frontend/dist/*.js` alongside their sources. The build bundles Svelte, all UI components, and the shared `styles.css` into the local `occupied-panel.js` asset; the separate model modules support tests. Release ZIPs and wheels include the built frontend, so installations need no Node tooling or external CDN. Test output in `tests/frontend/generated/` stays ignored. `pnpm test` compiles the pure model tests and exercises the committed frontend model modules without rebuilding them. `pnpm run lint` checks TypeScript sources and Svelte scripts/templates, including typed promise handling, keyed lists, import placement, and blank lines between declarations and methods. `pnpm run format:check` checks TypeScript, Svelte, and CSS with Prettier; generated assets are excluded. `pnpm run typecheck` checks TypeScript and Svelte types and accessibility diagnostics, failing on warnings. `pnpm run build:check` rejects missing, stale or unexpected assets without rewriting them. CI runs it before lint and tests, alongside `pnpm run typecheck` and `pnpm run format:check`.

`uv.lock` pins the complete test environment, including the HA frontend package. Python tests use virtual device handlers. Node tests cover the step editor’s model and validation logic. Test the UI in an installed Home Assistant instance. CI checks the supported HA matrix, generated schema, examples, hassfest/HACS metadata and installable artifacts; it uses locked Python and frontend development dependencies. See [release verification](docs/releasing.md) and [the editor guide](docs/editor.md). Tests use real HA config entries, entities, storage, timers, HTTP, and WebSocket APIs with virtual device handlers. They cover stable step sampling, midnight/DST, known-source date rules, compact round trips, typed ID renames, unknown startup state, handover, restart, persistence failure, manual control, dry run, managed files, instance isolation, authenticated saves, and preview isolation. No existing HA installation or physical devices are modified. Physical-device timing and a hardware soak remain deployment acceptance work.
