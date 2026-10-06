
# Occupied

<img src="media/occupied.svg" alt="Occupied: a smiling vintage occupied sign" height="200">

Occupied is a Home Assistant integration that simulated occupancy so that it looks like you are home when you are not. This integration is different than others because you create scenarios that can be run automatically with random variance.

It is the spiritual successor of https://github.com/acockburn/occusim

## Installation

1. Copy `custom_components/occupied/` into `<HA config>/custom_components/occupied/`, including `frontend/` and `translations/`.
2. Restart Home Assistant.
3. Open **Settings → Devices & services → Add integration → Occupied**.

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

The pure planner records nominal activity start/end pairs and declared resources. Device availability, start/ownership conditions, actual service latency, persistence, and cancellation remain runtime responsibilities for Milestone 3. Handover preview currently takes one sampled day; when completion crosses its boundary it reports `next_day_plan_required`.

## Development and verification

Install [uv](https://docs.astral.sh/uv/) and run:

```sh
uv sync --python 3.14 --locked
uv run pytest
uv run ruff check custom_components tests
uv run ruff format --check custom_components tests
```

`uv.lock` pins the complete test environment, including the HA frontend package. Tests load the integration through real Home Assistant config entries, entities, native conditions, timers, HTTP, and WebSocket APIs. Only physical light/remote handlers are virtual services in HA's real registry. Accelerated-clock tests verify the live caller chain and cleanup. Pure tests cover canonical round trips, ID migration, sampled bounds over many seeds, resource conflicts, midnight/DST, overlapping lighting leases, and handover projection. API tests verify preview isolation and admin authorization. No existing HA installation or physical devices are modified by these tests.
