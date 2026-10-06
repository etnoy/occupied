
# Occupied

<img src="media/occupied.svg" alt="Logo, a smiling occupied toilet sign" height="200">

Occupied is a Home Assistant integration that simulated occupancy so that it looks like you are home when you are not. This integration is different than others because you create scenarios that can be run automatically with random variance.

It is the spiritual successor of https://github.com/acockburn/occusim

Milestones 1–3 are implemented: canonical daily programs, durable plans/journals, gradual lighting handover, owned activity cleanup and restart recovery, dry run, and diagnostics. The full routine editor and managed-file/release workflow remain later milestones. See [the daily runtime guide](docs/runtime.md) for program apply, controls, recovery, and runtime limits.

## Installation

1. Copy `custom_components/occupied/` into `<HA config>/custom_components/occupied/`, including `frontend/` and `translations/`.
2. Restart Home Assistant.
3. Open **Settings → Devices & services → Add integration → Occupied**.
4. Create the household entry and keep its enabled permission off while configuring. Apply a canonical YAML/JSON program through the admin `occupied/apply` API as described in the runtime guide. The original proof settings remain supported.
5. Select **Dry run** in the sidebar panel to inspect simulated calls before selecting live execution. Enable permission when ready; activation conditions still apply.

There is one household entry. Applying a program stores a snapshot; it does not watch or modify the source YAML. No frontend build, AppDaemon, separate daemon, or open browser is required. The supported/tested baseline is Home Assistant Core **2026.9.4**, on Python **3.14.8** (HA requires Python >=3.14.2).

## Canonical programs and offline previews

See [the schema reference](docs/schema.md) and [the household example](examples/house.yaml). YAML files and JSON drafts use the same versioned model, defaults, graph validation, and planner. Labels and resource list order do not affect sampled times. Explicit ID migration rewrites typed references atomically.

The CLI requires Python 3.14.2 or later and its three direct planner dependencies. Install without HA using `uv sync --no-dev --locked`, or use the development environment below. You can also invoke it with `python -m custom_components.occupied.cli`.

```sh
occupied-config validate examples/house.yaml
occupied-config validate examples/house.yaml --date 2026-10-06 --days 7 --seed example
occupied-config preview examples/house.yaml --date 2026-10-06 --days 7 --seed example --output preview.json
occupied-config preview examples/house.yaml --date 2026-10-06 --seed example --handover-at 2026-10-06T18:00:00+02:00
occupied-config export examples/house.yaml --output normalized.yaml
occupied-config rename-id examples/house.yaml step wake morning_wake --output replacement.yaml
```

Validation and previews only read the source. Export and ID migration return YAML to stdout unless you explicitly select an output file. Exit status is 0 for valid/feasible results and 2 for invalid input or an infeasible sampled plan. Add `--json` to validation for structured issues, model paths, and YAML source locations. Validate with a date to check schedule feasibility after sun/timezone resolution.

Previews include UTC and local event times, intervals, stable event IDs, behavior/source hashes, and skipped/infeasible explanations. `--at` projects desired lighting; `--handover-at` projects each target at its completion deadline. A default `home_assistant` timezone needs `--timezone` offline; sun rules need program location or both `--latitude` and `--longitude`.

Authenticated admin WebSocket commands `occupied/validate`, `occupied/preview`, `occupied/export`, and `occupied/rename_id` expose these draft operations to the future editor. They require a loaded `config_entry_id` and a `program` JSON object or YAML string. Preview also takes ISO `date`, `seed`, optional `days` (1–31), and optional aware ISO `at`. ID migration takes `kind`, `old`, and `new`. These commands return drafts and previews without changing the live queue or calling device services.

The pure planner records nominal activity start/end pairs and declared resources. The daily runtime checks device availability, native start/ownership conditions, actual service latency, persistence, and cancellation. A single-day CLI handover preview reports `next_day_plan_required` across its boundary; the runtime loads the required endpoint date. Admin `occupied/diagnostics` exports redacted counts by default, with household details available only through explicit `include_sensitive: true`.

## Development and verification

Install [uv](https://docs.astral.sh/uv/) and run:

```sh
uv sync --python 3.14 --locked
uv run pytest
uv run ruff check custom_components tests
uv run ruff format --check custom_components tests
```

`uv.lock` pins the complete test environment, including the HA frontend package. All **180 tests pass with 91% Python coverage**, including 56 daily-runtime/API acceptance cases and all earlier regressions. Tests use real HA config entries, entities, native conditions, storage, timers, HTTP, and WebSocket APIs, with virtual physical-device handlers. They cover restart/overdue cleanup, immutable ends after apply, manual control, late/staggered starts, cross-day leases, persistence failure, capability fallbacks, dry run, bounded retries, authenticated apply/diagnostics, and preview isolation. Pure tests cover canonical round trips, ID migration, sampled bounds, resource conflicts, midnight/DST, and handover projection. No existing HA installation or physical devices are modified. Hardware and broader HA-version checks remain release work.
