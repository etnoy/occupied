
# Occupied

<img src="https://raw.githubusercontent.com/etnoy/occupied/main/media/occupied.svg" alt="Logo, a smiling occupied toilet sign" height="200">

Occupied manages selected Home Assistant entities using schedules, optional randomness and activation conditions. Use Home Assistant scenes for reusable sets of device states. Create separate controllers for devices with different rules: one can manage window lights each evening, while another manages ceiling lights only when the alarm is armed.

It is the spiritual successor of https://github.com/acockburn/occusim

Occupied includes the complete editor and timeline, canonical daily programs, durable plans/journals, gradual lighting handover, owned activity cleanup and restart recovery, dry run, diagnostics, and authoritative managed YAML. See [the editor guide](docs/editor.md), [daily runtime guide](docs/runtime.md), and [managed/Puppet guide](docs/managed-configuration.md).

## Installation

1. Add `https://github.com/etnoy/occupied` as a HACS custom repository of type **Integration**. Choose a tagged release, or select `main` to follow development directly. The repository includes the compiled frontend. As an alternative, extract release `occupied.zip` inside `<HA config>/custom_components/occupied/`. See [installation, upgrades and uninstall](docs/installation.md).
2. Restart Home Assistant.
3. Open **Settings → Devices & services → Add integration → Occupied**. Enter a controller name (default: **Occupied**) and submit. Each controller needs a distinct name.
4. Open **Occupied** under **Settings → Devices & services** and select **Configure**. Choose the editor, import an Occupied YAML snapshot, or select an authoritative managed file. Select **Create your first step**, choose entity actions or a Home Assistant scene, and a start time or interval, then **Save step**. Select a step and **Add related step** to schedule what happens before or after it. Saving validates automatically. Existing proof settings remain supported and open with an editable daily starter program.
5. Use **Preview** to review your steps. **Settings** opens YAML import/export and managed-file controls directly. Use the integration's Home Assistant switches to enable management or select dry-run mode; activation conditions still apply.

Each controller is a separate integration entry with its own program, optional managed file, activation conditions, permission, seed and runtime state. The Occupied panel lets you select a controller; Configure opens the selected integration entry. GUI/import mode stores snapshots. Managed-file mode detects changes and supports validated `occupied.reload`; invalid updates retain that controller's running program, and invalid initial files remain inactive. Shared declared device targets show a warning because actions and cleanup can interfere; ownership is not coordinated across controllers. Occupied never writes managed files. No frontend build at installation, AppDaemon, separate daemon, or open browser is required. The tested matrix is Home Assistant Core **2026.9.3 and 2026.9.4**, on Python **3.14.8** (HA requires Python >=3.14.2).

## Canonical programs and offline previews

See [the schema reference](docs/schema.md), [the controller example](examples/house.yaml) and [the GUI export](examples/gui-house.yaml). YAML files and JSON drafts use the same versioned model, defaults, graph validation, and planner. Labels and resource list order do not affect sampled times. Explicit ID migration rewrites typed references atomically.

The CLI requires Python 3.14.2 or later and its three direct planner dependencies. Install the release wheel without HA using `pip install ./occupied-0.1.0-py3-none-any.whl`, use `uv sync --no-dev --locked`, or use the development environment below. You can also invoke it with `python -m custom_components.occupied.cli`.

```sh
occupied-config validate examples/house.yaml
occupied-config validate examples/house.yaml --date today --days 7 --timezone Europe/Stockholm
occupied-config validate examples/house.yaml --date 2026-10-06 --days 7 --seed example
occupied-config preview examples/house.yaml --date 2026-10-06 --days 7 --seed example --output preview.json
occupied-config preview examples/house.yaml --date 2026-10-06 --seed example --handover-at 2026-10-06T18:00:00+02:00
occupied-config export examples/house.yaml --output normalized.yaml
occupied-config rename-id examples/house.yaml step wake morning_wake --output replacement.yaml
```

Validation and previews only read the source. Export and ID migration return YAML to stdout unless you explicitly select an output file. Exit status is 0 for valid/feasible results and 2 for invalid input or an infeasible sampled plan. Add `--json` to validation for structured issues, model paths, and YAML source locations. Validate with a date to check schedule feasibility after sun/timezone resolution.

Previews include UTC and local event times, intervals, stable event IDs, behavior/source hashes, and skipped/infeasible explanations. `--at` projects desired lighting; `--handover-at` projects each target at its completion deadline. A default `home_assistant` timezone needs `--timezone` offline; sun rules need program location or both `--latitude` and `--longitude`.

Authenticated admin WebSocket commands `occupied/validate`, `occupied/preview`, `occupied/export`, and `occupied/rename_id` expose these draft operations to the editor. They require a loaded `config_entry_id` and a `program` JSON object or YAML string. Preview also takes ISO `date`, `seed`, optional `days` (1–31), and optional aware ISO `at`. ID migration takes `kind`, `old`, and `new`. These commands return drafts and previews without changing the live queue or calling device services.

The pure planner records nominal activity start/end pairs and declared resources. The daily runtime checks device availability, native start/ownership conditions, actual service latency, persistence, and cancellation. A single-day CLI handover preview reports `next_day_plan_required` across its boundary; the runtime loads the required endpoint date. Admin `occupied/diagnostics` exports redacted counts by default, with controller details available only through explicit `include_sensitive: true`.

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
`mise lint` runs Ruff, ESLint on the shipped frontend JavaScript, and strict TypeScript/Svelte type
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

The frontend uses Svelte 5 and TypeScript, with `OccupiedPanel` as HA’s custom element and backend controller. HTML lives in `.svelte` components, using template blocks for conditionals and lists. The panel shell, step editor, source picker, and timeline have separate components; model and validation logic remain independent of rendering. The editor requires Home Assistant and loads its native selectors and picker before rendering. A small DOM bridge passes object properties and custom events to those HA elements. Controller updates use Svelte's `flushSync` so editor actions can immediately focus newly rendered fields. TypeScript 6 is pinned for compatibility with `svelte-check`'s TypeScript API; strict checks cover both TypeScript and Svelte sources.

Run `pnpm run build` after editing `.ts` or `.svelte` files and commit the generated `custom_components/occupied/frontend/dist/*.js` alongside their sources. The build bundles Svelte and all UI components into the local `occupied-panel.js` asset; the separate model modules support tests. Release ZIPs and wheels include the built frontend, so installations need no Node tooling or external CDN. Test output in `tests/frontend/generated/` stays ignored. `pnpm test` compiles the pure model tests and exercises the committed frontend model modules without rebuilding them. `pnpm run lint` checks the generated application modules; the compiler-generated Svelte bundle is covered by strict template checks. `pnpm run build:check` rejects missing, stale or unexpected assets without rewriting them. CI runs it before lint and tests, alongside `pnpm run typecheck` and `pnpm run format:check`.

`uv.lock` pins the complete test environment, including the HA frontend package. Python tests use virtual device handlers. Node tests cover the step editor’s model and validation logic. Test the UI in an installed Home Assistant instance. CI checks the supported HA matrix, generated schema, examples, hassfest/HACS metadata and installable artifacts; it uses locked Python and frontend development dependencies. See [release verification](docs/releasing.md) and [the editor guide](docs/editor.md). Tests use real HA config entries, entities, native conditions, storage, timers, HTTP, and WebSocket APIs, with virtual physical-device handlers. They cover restart/overdue cleanup, immutable ends after apply, manual control, late/staggered starts, cross-day leases, persistence failure, capability fallbacks, dry run, bounded retries, authenticated apply/diagnostics, and preview isolation. Pure tests cover canonical round trips, ID migration, sampled bounds, resource conflicts, midnight/DST, and handover projection. No existing HA installation or physical devices are modified. Physical-device timing and a hardware soak remain deployment acceptance work.
