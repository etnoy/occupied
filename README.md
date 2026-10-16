# Occupied

<img src="https://raw.githubusercontent.com/etnoy/occupied/main/media/occupied.svg" alt="Logo, a smiling occupied toilet sign" height="200">

Burglars look for living spaces that look like nobody's home: make sure yours looks occupied!

Occupied is an occupancy simulator for Home Assistant that lets you create schedules for lights, covers, and other entities. But remember the scene in *Home Alone* where Harry knows exactly when each house's lights will come on? Your timers probably shouldn't be that predictable. Therefore, Occupied has built in support for randomness to make your home look lived in. It also has an easy-to-use GUI, which makes it much easier to set up than traditional automations.

Occupied is the spiritual successor of [Occusim](https://github.com/acockburn/occusim) which is no longer maintained. 

# Use cases

* Make your home look occupied while you are away by turning lights on and off at varied times, activating scenes, or opening and closing covers.
* Schedule everyday lighting around sunrise, sunset, or bedtime, with randomized windows instead of the same exact times each day.
* Run a schedule only when your alarm is armed. You can also save power by having Occupied turn off extra lights or switches, such as those in a windowless bathroom.

# Installation

Install through [HACS](https://hacs.xyz/):

1. Open HACS, select the three-dot menu, and choose **Custom repositories**.
2. Add `https://github.com/etnoy/occupied` with the category **Integration**.
3. Find Occupied in HACS and download it, then restart Home Assistant.
4. Go to **Settings → Devices & services → Add integration → Occupied** and create a controller. Choose GUI storage to get started with the editor.
5. Select **Configure** on the integration to open the Occupied panel.

New controllers start with permission disabled, so you can create and preview a schedule before enabling it. See the [installation guide](docs/installation.md) for manual installation, upgrades, and troubleshooting.

# Usage

Occupied is based around Steps ("turn this light on at that time") or Random Events ("turn a light on and off twice during the day")

## Create a Step

Open Occupied through the integration's **Configure** control (the cog wheel), then choose **Create your first step** in the **Steps** tab.

1. Choose **Absolute time** to run the action at a specific time ("run at 8 AM"), or have it be a random time within a window ("run between 7:30 AM and 8:30 AM")
2. Choose **Relative to** to run the action relative to another event, say "run at sunrise" or "run this step after that step". You add a time offset, like "run 30 minutes before dawn" and optionally make it choose a random time, say "run at a random time between 20 and 40 minutes after sunset"
2. Next, choose an action to run. A simple example is to turn a light on
4. Click on **Save step**. 

You can now create more steps and have those steps either be absolute in time, or relative to the previous step

For more advanced usage like turning on a light at a specific brigthness, use **Custom YAML** as the action. See [Custom YAML actions](docs/custom-yaml.md).

## Create a Random Event

Random Events manage a light for both on and off, so you can have a kitchen light that turns on and off for a few times during the day.

1. In the Random tab, choose **Create your first random event** and set its start and end window, for example 18:00–23:00. The window can also start relative to a step or solar event, and end after a fixed or random duration.
2. Set the number of occurrences. Add a maximum to choose a random count within a range, and you can set the minimum to zero so that the event does not happen every day.
3. Set the minimum and maximum duration of each occurrence, such as 5–15 minutes.
4. Choose the entities to turn on and off during each window.
5. Save the random event.

## Preview the timeline

Open **Preview** to see how the entities would be turned on and off. This will be a render of the random events within the ranges you chose before, so navigate back and forth during the days to see how those will be randomized.

## Add a run condition

You probably only want to pretend someone is home when nobody actually is. A run condition lets you do that, say "only run when the alarm is armed" or "only run when my away mode helper is on".

In **Settings → Run condition**, enable **Run only when an entity matches**, pick your entity, and choose the states that should let Occupied run. For an alarm, that could be `armed_away`, or both `armed_away` and `armed_night`.

When the condition stops matching, i.e. when you get home and disarm the alarm, Occupied stops running actions and leaves the lights as they are. 

## Enable the integration

When ready, turn on the controller's **Enable** switch in Home Assistant. You will see the **Status** sensor change to **Active** if Occupied has started managing, and **Next event** will update with when the next action will be taken. If the status says **Waiting**, the **Status reason** sensor will tell you why; likely you have a run condition it is waiting on.


# Advanced usages

## Multiple controllers

You can have more than one Occupied controller, each with its own schedule and run condition. For example, one controller can pretend someone is home while you're away, with random lights and a run condition like "only run when the alarm is armed". Another can handle your everyday lights, turning window lights on at sunset and off at sunrise, without a run condition so it runs whether you're home or not.

To add another controller, go to **Settings → Devices & services → Add integration → Occupied** again and give it a different name. You can switch between controllers in the Occupied panel, and each has its own **Enable** switch.

## Factorio-style lights

Enable **Staggered action** under a step's **Advanced settings** to turn lights or switches on or off one at a time in a shuffled order. The **Time window** defaults to `2m`. With four entities over two minutes, actions occur at 30-second intervals, giving the impression of someone walking through the house. See the [staggered-action example](examples/stagger.yaml).

## Enforce state when a run condition starts

Under **Settings → Run condition**, select an entity and its allowed states, then enable **Enforce expected state on start**. For example, use an alarm panel with `armed_away` so Occupied applies the schedule's known light, switch, and cover targets when you leave. **Delay before enforcing state** defaults to `30s`, giving you time to get out of the house before device changes begin.

Use **Extra entities to turn off** for lights and switches outside the schedule, such as bathroom lights. These turn off during startup enforcement. Without enforcement, a matching run condition starts future scheduled actions only. When the condition stops matching, Occupied stops scheduling without changing device states.

You can also press **Enforce expected state** on the controller's Home Assistant device to apply known targets immediately. This requires permission, unpaused scheduling, and a matching run condition if one is configured. See [run conditions](docs/runtime.md#run-condition-and-delayed-state-enforcement) and the [alarm example](examples/alarm.yaml).

## Limit when a step can run

Use the timing controls to combine clock times and solar events:

* **No later than** caps a step's time. For example, turn lights on 90 minutes before sunset, but no later than 18:00.
* **Only run before** skips a step unless its time is strictly before the selected boundary. For example, turn lights on at 05:30 only if that is before sunrise plus 90 minutes.

Both controls can be combined. Preview explains capped and skipped occurrences. See [timing limits](docs/schema.md#step-timing-limits) and the [lighting example](examples/solar-limits.yaml).

## Try a live preview

In **Preview**, choose a date and select **Start live preview** to test the schedule on real devices. Walk around with your phone and press **Next event** to run each action immediately instead of waiting for its scheduled time. Unsaved drafts can be tested too.

Live preview pauses normal scheduling. **Stop** and **Day complete** leave devices as they are and scheduling paused; choose **Resume scheduling** when you want normal operation again. Configured run conditions must still match during live preview. See [manual live preview](docs/editor.md#manual-live-preview).

# YAML configuration

## Import and export

The GUI and YAML use the same program format. Open **Settings** to edit the YAML directly or load a YAML/JSON file, then choose **Save changes** to validate and apply it. Importing a file this way copies its contents into GUI storage; later changes to the original file do not update the controller. **Download** exports the current editor text.

For example, this program turns a living-room light on between 18:00 and 18:30, then turns it off two hours after the sampled start:

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

See the [schema reference](docs/schema.md) and [example programs](examples/house.yaml) for more options.

## Use a managed YAML file

To keep configuration in a file instead of GUI storage, put a complete Occupied program at `/config/occupied/house.yaml`, then add this to Home Assistant's `configuration.yaml` and restart:

```yaml
occupied:
  config_file: occupied/house.yaml
```

The path is relative to Home Assistant's configuration directory. You can also select a managed file when adding the integration. Each controller has its own permission and schedule; named instances support multiple managed files.

The file remains authoritative, and Occupied never writes to it. Changes are detected automatically; call `occupied.reload` with the controller's `config_entry_id` for an immediate reload. Invalid updates leave the current valid in-memory program running, but an invalid file at startup must be corrected before that controller can run.

You can use the editor to preview and export drafts in managed-file mode. Apply changes by updating the source file and reloading it. See [managed configuration](docs/managed-configuration.md) for source switching, multiple instances, and deployment with Puppet.

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

The frontend uses Svelte 5 and TypeScript, with `OccupiedPanel` as HA’s custom element and backend controller. Sources live in `custom_components/occupied/frontend/src/`, following Immich's `web/src/lib` organization: components are grouped by feature in `lib/components`, with separate folders for controllers, models, actions, services, translations, and utilities. See the [frontend layout](custom_components/occupied/frontend/README.md). HTML lives in `.svelte` components, using template blocks for conditionals and lists. Model and validation logic remain independent of rendering. Preview orchestration lives in `lib/controllers/preview-controller.ts`; subscription lifecycle guards live in `lib/services/subscription.ts`. The editor requires Home Assistant and loads its native selectors and picker before rendering. A small DOM bridge passes object properties and custom events to those HA elements. Controller updates use Svelte's `flushSync` so editor actions can immediately focus newly rendered fields. TypeScript 6 is pinned for compatibility with `svelte-check`'s TypeScript API; strict checks cover both TypeScript and Svelte sources.

Frontend style uses two-space indentation and Prettier's 80-column wrapping. Separate imports from code, declarations and methods from their neighbors, and logical sections with blank lines. In Svelte scripts, group imports, props, state, derived values, and handlers; keep conditional/list bodies on separate lines and key repeated elements. Move complex label expressions into named helpers. Shared CSS lives in `src/app.css` and is injected into the panel's shadow root; keep related selectors together and preserve cascade order. Run `pnpm run lint:fix` for automatic lint/spacing fixes and `pnpm run format:fix` for formatting; both rebuild the shipped assets.

Run `pnpm run build` after editing `.ts`, `.svelte`, or `.css` files and commit the generated JavaScript under `custom_components/occupied/frontend/dist/` alongside its sources. The build preserves the source directory structure for modules and bundles Svelte, all UI components, and the shared `src/app.css` into the local `dist/occupied-panel.js` asset; the separate model modules support tests. Release ZIPs and wheels include the built frontend, so installations need no Node tooling or external CDN. Test output in `tests/frontend/generated/` stays ignored. `pnpm test` compiles the pure model tests and exercises the committed frontend model modules without rebuilding them. `pnpm run lint` checks TypeScript sources and Svelte scripts/templates, including typed promise handling, keyed lists, import placement, and blank lines between declarations and methods. `pnpm run format:check` checks TypeScript, Svelte, and CSS with Prettier; generated assets are excluded. `pnpm run typecheck` checks TypeScript and Svelte types and accessibility diagnostics, failing on warnings. `pnpm run build:check` rejects missing, stale or unexpected assets without rewriting them. CI runs it before lint and tests, alongside `pnpm run typecheck` and `pnpm run format:check`.

`uv.lock` pins the complete test environment, including the HA frontend package. Python tests use virtual device handlers. Node tests cover the step editor’s model and validation logic. Test the UI in an installed Home Assistant instance. CI checks the supported HA matrix, generated schema, examples, hassfest/HACS metadata and installable artifacts; it uses locked Python and frontend development dependencies. See [release verification](docs/releasing.md) and [the editor guide](docs/editor.md). Tests use real HA config entries, entities, storage, timers, HTTP, and WebSocket APIs with virtual device handlers. They cover stable step sampling, midnight/DST, known-source date rules, compact round trips, typed ID renames, unknown startup state, handover, restart, persistence failure, manual control, managed files, instance isolation, authenticated saves, and preview isolation. No existing HA installation or physical devices are modified. Physical-device timing and a hardware soak remain deployment acceptance work.
