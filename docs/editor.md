# Occupied editor

Create Occupied through **Settings → Devices & services → Add integration**. Choose **Create with Occupied editor** for an empty household, or **Import Occupied YAML** for a stored snapshot. Permission starts disabled. Open Occupied under **Settings → Devices & services** and select **Configure**. Existing development-proof entries open with an editable daily starter program; saving upgrades them to the daily runtime.

## Create a step

**Your steps** is the home screen. It shows the action, entities or scene, days and timing for each step, with related steps together. Select **Create your first step**, or **Create step** when a program already exists:

1. **Timing:** choose **Absolute time** for a single start time using Home Assistant's native time selector when its component is loaded, with a browser time input as the fallback. Select **Add end of window** for an optional end time; an end before the start crosses midnight. Choose **Relative to** to select another step, sunrise or sunset, then set a **Start offset** such as `10s`, `20m` or signed `-30m`. **Add end offset** makes an interval. Offset fields validate while typing and on blur, explaining invalid h/m/s formats, offsets beyond seven days, and end offsets earlier than the start. Without an end value, the time or offset is fixed; with an end value, the start is sampled uniformly between the bounds. Existing weekday settings are preserved; repeat controls are currently available only in Advanced settings.
2. **Entities:** choose lights/switches, an entity service action, or a Home Assistant scene. Select one or more entities for actions, or one scene to activate. Search by friendly name, room or entity ID. No entity group is required.
3. **Action:** choose **Turn on** or **Turn off** for lights/switches, enter a `domain.service` and JSON data for other entity actions, or activate the selected scene. The step name sits above the editor columns. Brightness is optional and appears for dimmable lights. Mixed light/switch selections keep light settings separate from switch calls.
4. **Save step** validates with the backend and saves in one action. Errors appear by the relevant field. Newly selected managed lights receive an off baseline and the default handover settings; existing baselines and overrides are preserved.

Select a saved step and choose **Add related step** to create what happens before or after it. The parent, entities and days are prefilled; change the timing and entities as needed. Weekdays remain available in Advanced settings. For example, turn on living-room lights around 18:00, turn on kitchen lights 30 minutes later, then turn everything off two hours after the kitchen step. Offsets follow the parent's sampled scheduled time, including its sampled window, rather than actual device-call completion. Circular choices are excluded. Incompatible weekdays are explained inline.

Selecting a row also exposes **Edit step**, which opens timing, entities and action together on one page. Change any combination of fields and select **Save step**; errors appear beside their fields. New steps use the guided creation flow. **More options** contains duplicate, delete and advanced settings. Deletion is blocked while other steps depend on the selected step, with those steps named. Duplicate/delete create draft changes; **Save changes** validates and applies them. **Discard edits** restores the saved program. **Cancel** discards only that editor's pending changes.

**Preview schedule** opens a planner preview without controlling devices. Saving does not enable execution. Use **Settings** to configure activation conditions and dry-run mode, then **Turn on simulation** when ready.

## Settings and existing programs

**Settings → Only run when** contains activation conditions. Enter one exact allowed state per line, such as `armed` and `armed_away`. `armed away` remains one state containing a space. Multiple entities can require all or any to match; nested and/or/not conditions are available. Empty top-level conditions allow activation whenever the simulation is enabled. Unknown/unavailable dependencies block execution. Home Assistant supplies timezone and location by default; the default simulation-day boundary is 02:00.

**Settings → Advanced settings** provides custom steps and activities, reusable groups, household/location, lighting handover, defaults/policies, execution history, diagnostics and import/export. Select a section and **Open** it. Complex existing steps appear on the home screen with **Edit in Advanced settings**. Complex service sequences and television activities use this editor.

The editor names timed behaviors **steps**. The builder maps them to existing canonical steps; the version 1 `routines` field remains a compatibility container for defaults, weekdays, activities and windows. No configuration migration is required. It preserves stable IDs, group references, container defaults, and unrelated activities/windows. Changing a selection does not edit a shared group. Widening one existing step's days beyond its container creates a separate container with the same inherited settings, leaving its siblings intact.

Every schema field remains available in advanced forms or JSON. Durations there use h/m/s strings, such as `45m`, `10m` or signed `-30m` offsets. Invalid JSON stays in the draft across navigation and blocks saving. After changing an entire advanced object, refresh its forms or save its validated normalized program. **Save changes** automatically validates, including registered native service schemas, without executing them.

Runtime updates preserve open forms and their focus. Edits made while validation/save waits are retained. Saves include the revision read when editing began; concurrent changes reject stale saves. **Reload saved program** explicitly discards a stale draft. Metadata-only name edits retain sampled times, session and handover/activity deadlines. Behavior changes replace future work while retaining immutable cleanup for already-started activities.

In advanced forms, **Migrate identifier** asks the backend to validate and rewrite typed references in one transaction. Opaque service data stays unchanged. This creates a draft requiring **Save changes**. ID changes affect random-stream identity; change names to relabel existing resources without changing today's times.

## Timing and activities

Steps/activities support clock ranges, sunrise/sunset offsets with clock fallbacks, and offsets from another step. The builder edits start and optional end bounds directly and handles midnight crossings. Clearing an end returns to a fixed start time or offset. New builder steps allow crossing the simulation-day boundary so related steps can follow an overnight parent. Existing boundary policies remain unchanged. Relationships are shown directly in **Your steps**; the backend validates the full graph.

Random windows offer clock/sun/step anchors, cycle counts, duration bounds, gaps, overlap, all/one/subset/weighted targets and concurrency limits. Item weekdays intersect their routine's days. Defaults inherit household → routine → item; **Inherit** removes an override. Preview reports infeasible schedules instead of silently extending windows.

The **Harmony television preset** selects a remote and its native activity name. It creates a 19:45–20:15 range, fixed 45-minute duration, explicit `remote.turn_on`/`remote.turn_off`, an off-state start condition and `current_activity` ownership predicate. Every resulting field remains editable. Runtime duration starts after the final successful start call; actual deadlines can differ from nominal preview ends. Manual activity changes suppress cleanup. Generic services require explicit ends/resources/data; inverses are never inferred.

## Timeline, preview and YAML

**Execution history** in Advanced settings reads saved runtime plans and outcomes. It shows sampled step markers, nominal activity/window bars, current handover ramps and immutable active deadlines. The filtered/paged event table distinguishes planned times, dispatch times and actual deadlines, using the saved timezone. The diagram caps at 800 marks; tables/downloads retain all events. Opening it cannot reroll plans or replay historical skipped events.

**Preview schedule** runs the same backend planner as the CLI against the draft. Choose a date; **Preview options** contains 1–31 days, a separate seed and an optional aware ISO projection instant, such as `2026-10-06T18:00:00+02:00`. Reroll changes only the preview seed. The projection instant adds projected lighting and handover endpoints. Older results are marked after edits. Preview never changes runtime permission, plans or devices; saving does not adopt its seed.

**Import, export and managed files** in Advanced settings imports only Occupied YAML/JSON. Import validates and replaces the draft without applying it. Export normalizes defaults through the shared schema; comments are not retained. Download writes a local file. This section also selects authoritative managed files, reloads them, reports source errors, and explicitly copies the saved program to GUI storage. Managed drafts remain editable for preview/export: the step builder ends with **Add to draft**, while **Save changes** is disabled and file authority is enforced by the backend. See [managed configuration](managed-configuration.md).

**Diagnostics** exports redacted counts by default. Explicit household details add plans, observations, lifecycles, journal and outcomes; known credential fields remain redacted. The panel also shows recent outcomes.

The [step example](../examples/steps.yaml) follows Morning → Breakfast with a 10-second to 20-minute interval and includes a scene and a sunrise service action. The [hand-authored example](../examples/house.yaml) and captured [GUI export](../examples/gui-house.yaml) cover weekdays/weekends, exact states, sun/relative rules, Harmony and group handover. Replace virtual entity IDs before use.

## API and compatibility

Commands require an authenticated admin and loaded `config_entry_id`:

| Command | Purpose / additional fields |
| --- | --- |
| `occupied/program` | Normalized program, revision, source, resolved date/timezone |
| `occupied/catalog` | Entity names/areas/capabilities and native service descriptions/selectors |
| `occupied/editor_validate` | Validate `program`, including installed service schemas |
| `occupied/save` | Save `program` with required `expected_revision`; reject `revision_conflict` |
| `occupied/timeline` | Read saved plans/outcomes for optional ISO `date` |
| `occupied/source`, `occupied/reload` | Explicit guarded source selection and validated managed-file reload |
| `occupied/subscribe` | Runtime snapshots through HA's connection subscription API |
| `occupied/validate`, `preview`, `export`, `rename_id` | Shared pure draft operations in [the schema reference](schema.md) |
| `occupied/diagnostics` | Optional `include_sensitive: true` for household details |

Bundled local ES modules need no frontend build or extra runtime dependency. Static assets contain no household data. The editor follows HA's [custom-panel contract](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels/) and checks for `ha-selector` before using the [pinned selector interface](https://github.com/home-assistant/frontend/blob/20260826.7/src/components/ha-selector/ha-selector.ts); standard accessible controls are the fallback. English is complete; Swedish navigation/common controls have English fallback. CI verifies the supported HA matrix and desktop/mobile workflows.

## Browser acceptance fixture

```sh
.venv/bin/python tests/frontend/serve.py
node --test tests/frontend/model.test.mjs
```

Open `http://127.0.0.1:8765/tests/frontend/harness.html` and run `await window.runWorkflows()` in its browser console. All twenty-two results must have `passed: true`. Reload before repeating to reset the selector shim. For mobile checks, load it in a 390-pixel viewport or same-origin iframe and run its workflows; it also checks horizontal overflow.

The fixture uses production modules, real pure backend validation/planning and a virtual runtime. It covers the step builder, mixed light/switch actions, chained steps, weekday/cycle/delete protection, sun and overnight timing, inline errors, edits during validation/save, and managed-file drafts. It also retains coverage of advanced forms, safe labels, exact state lists, round trips, migration, Harmony, diagrams, stale saves, selector compatibility and cleanup, with zero device calls. Real HA tests separately verify authentication, schemas, storage failures, actual deadlines and static routes. Full running-HA browser/hardware soak remains deployment acceptance work. The HA compatibility matrix and browser CI are described in [release verification](releasing.md).
