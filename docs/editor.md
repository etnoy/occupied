# Occupied editor

Create Occupied through **Settings → Devices & services → Add integration**. Choose **Create with Occupied editor** for an empty household, or **Import Occupied YAML** for a stored snapshot. Permission starts disabled. Open **Occupied** in the sidebar. Existing development-proof entries open with an editable daily starter program; saving upgrades them to the daily runtime.

## Configure and save

1. In **Household**, set the name, timezone and simulation-day boundary (default 02:00). Location and timezone can inherit Home Assistant. The evening quick-start template adds a light group, evening on and bedtime off steps, and an off baseline.
2. Add native **Activation conditions**. Enter one exact allowed state per line, such as `armed` and `armed_away`. `armed away` remains one state containing a space. Multiple entities can require all or any to match; nested and/or/not conditions are available. Empty top-level conditions allow activation whenever permission is enabled. Unknown/unavailable dependencies block execution.
3. In **Groups**, select and label entities. HA selectors are used when available; the standard fallback searches names, areas and IDs. Explicit IDs remain available for unresolved entities. Member capability information shows native fades and stepped fallbacks.
4. In **Routines**, create weekday/weekend routines, then add steps, timed activities and random windows. Resources have stable IDs and mutable names. Copies receive new IDs; dependencies within a copied routine follow its copied steps. Deleting referenced resources reports the references to remove first.
5. In **Lighting handover**, declare managed lights and an explicit baseline for each. Set duration, dimming and step interval, with group overrides. The default is ten minutes. The endpoint is the projected state at each light's completion time; the overview shows observed state, target, progress and deadline.
6. Select **Validate draft**. Errors link to forms; warnings identify unresolved entities, missing services and other conditions. Registered native service schemas are checked without executing them. Then select **Save program**. Editing any field requires validation again.
7. Select **Dry run** in the overview before enabling a new program. Review the timeline/diagnostics, then select live execution when ready. Permission, pause and activation conditions remain separate runtime controls.

Every schema field has a form or an explicit **Advanced configuration** section. Durations use h/m/s strings, such as `45m`, `10m` or signed `-30m` offsets. Generic service data, uncommon color settings and entity weights also have JSON controls. Invalid JSON stays in the draft across tabs and blocks validation/save. Discard restores the saved program. After changing an entire advanced object, refresh its forms or save its validated normalized program.

Runtime updates preserve open forms and their focus. Edits made while validation/save waits are retained. Saves include the revision read when editing began; concurrent changes reject stale saves. **Reload saved program** explicitly discards a stale draft. Metadata-only name edits retain sampled times, session and handover/activity deadlines. Behavior changes replace future work while retaining immutable cleanup for already-started activities.

**Migrate identifier** asks the backend to validate and rewrite typed references in one transaction. Opaque service data stays unchanged. This creates a draft requiring validation/save. ID changes affect random-stream identity; change names to relabel existing resources without changing today's times.

## Timing and activities

Steps/activities support clock ranges, sunrise/sunset offsets with clock fallbacks, and offsets from another step. **Around a time** converts a center/spread into clock bounds. Midnight and simulation-day crossings are explicit. **Dependencies** exposes these relationships; circular parent choices are excluded and the backend validates the full graph.

Random windows offer clock/sun/step anchors, cycle counts, duration bounds, gaps, overlap, all/one/subset/weighted targets and concurrency limits. Item weekdays intersect their routine's days. Defaults inherit household → routine → item; **Inherit** removes an override. Preview reports infeasible schedules instead of silently extending windows.

The **Harmony television preset** selects a remote and its native activity name. It creates a 19:45–20:15 range, fixed 45-minute duration, explicit `remote.turn_on`/`remote.turn_off`, an off-state start condition and `current_activity` ownership predicate. Every resulting field remains editable. Runtime duration starts after the final successful start call; actual deadlines can differ from nominal preview ends. Manual activity changes suppress cleanup. Generic services require explicit ends/resources/data; inverses are never inferred.

## Timeline, preview and YAML

**Timeline** reads saved runtime plans and outcomes. It shows sampled step markers, nominal activity/window bars, current handover ramps and immutable active deadlines. The filtered/paged event table distinguishes planned times, dispatch times and actual deadlines, using the saved timezone. The diagram caps at 800 marks; tables/downloads retain all events. Opening it cannot reroll plans or replay historical skipped events.

**Preview** runs the same backend planner as the CLI against the draft. Choose a date, 1–31 days and a separate seed. Reroll changes only the preview seed. An optional aware ISO projection instant, such as `2026-10-06T18:00:00+02:00`, adds projected lighting and handover endpoints. Older results are marked after edits. Preview never changes runtime permission, plans or devices; saving does not adopt its seed.

**Configuration** imports only Occupied YAML/JSON. Import validates and replaces the draft without applying it. Export normalizes defaults through the shared schema; comments are not retained. Download writes a local file. Imports are stored snapshots: Occupied neither watches nor changes the source file. Authoritative managed-file mode remains Milestone 5.

**Diagnostics** exports redacted counts by default. Explicit household details add plans, observations, lifecycles, journal and outcomes; known credential fields remain redacted. The panel also shows recent outcomes.

The [hand-authored example](../examples/house.yaml) and captured [GUI export](../examples/gui-house.yaml) cover weekdays/weekends, exact states, sun/relative rules, Harmony and group handover. Replace virtual entity IDs before use.

## API and compatibility

Commands require an authenticated admin and loaded `config_entry_id`:

| Command | Purpose / additional fields |
| --- | --- |
| `occupied/program` | Normalized program, revision, source, resolved date/timezone |
| `occupied/catalog` | Entity names/areas/capabilities and native service descriptions/selectors |
| `occupied/editor_validate` | Validate `program`, including installed service schemas |
| `occupied/save` | Save `program` with required `expected_revision`; reject `revision_conflict` |
| `occupied/timeline` | Read saved plans/outcomes for optional ISO `date` |
| `occupied/subscribe` | Runtime snapshots through HA's connection subscription API |
| `occupied/validate`, `preview`, `export`, `rename_id` | Shared pure draft operations in [the schema reference](schema.md) |
| `occupied/diagnostics` | Optional `include_sensitive: true` for household details |

Bundled local ES modules need no frontend build or extra runtime dependency. Static assets contain no household data. The editor follows HA's [custom-panel contract](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels/) and checks for `ha-selector` before using the [pinned selector interface](https://github.com/home-assistant/frontend/blob/20260826.7/src/components/ha-selector/ha-selector.ts); standard accessible controls are the fallback. English is complete; Swedish navigation/common controls have English fallback. Broader version/browser release checks remain Milestone 5.

## Browser acceptance fixture

```sh
.venv/bin/python tests/frontend/serve.py
node --test tests/frontend/model.test.mjs
```

Open `http://127.0.0.1:8765/tests/frontend/harness.html` and run `await window.runWorkflows()` in its browser console. All twelve results must have `passed: true`. Reload before repeating to reset the selector shim. For mobile checks, load it in a 390-pixel viewport or same-origin iframe and run its workflows; it also checks horizontal overflow.

The fixture uses production modules, real pure backend validation/planning and a virtual runtime. It covers all screens, safe labels, state lists, round trips, validation focus, migration, Harmony, rendered diagrams, stale/in-flight saves, quick start, selector compatibility and cleanup, with zero device calls. Real HA tests separately verify authentication, schemas, storage failures, actual deadlines and static routes. Full running-HA browser/hardware soak and the release matrix remain later acceptance work.
