# Occupied editor

Create Occupied through **Settings → Devices & services → Add integration**. Setup asks for a controller name, prefilled with `Occupied`, then creates an empty controller for the Occupied editor. If another controller already uses the submitted name, setup asks you to choose a different name. Its Home Assistant device name also defaults to `Occupied` and can be edited in the naming dialog. Permission starts disabled. Open Occupied under **Settings → Devices & services** and select **Configure**. Import YAML later from **Settings**. Existing development-proof entries open with an editable daily starter program; saving upgrades them to the daily runtime.

The shared Occupied panel offers a **Controller** selector when several entries exist. **Configure** on an integration entry opens that controller directly. Switching controllers confirms unsaved draft or step edits; canceling preserves them. Drafts, previews, history and subscriptions are specific to the selected controller. Unloaded entries remain listed, and invalid managed files remain inspectable with their own Repairs. A warning names any declared controlled entities shared with another loaded controller.

## Create a step

**Steps** is the home screen. It shows the action, entities or scene, days and timing for each step, with related steps together. Select **Create your first step**, or **Create step** when a program already exists. Creation and editing use the same form with two columns: **Timing** on the left and **Action** on the right. The Action column starts with an action type selector, followed by **Entities** and the action settings. On narrow screens, the columns stack:

1. **Timing:** choose **Absolute time** for a single start time using Home Assistant's native time selector. Select **Add end of window** for an optional end time; an end before the start crosses midnight. Choose **Relative to** to select another step, sunrise or sunset, then set a **Start offset** such as `10s`, `20m` or signed `-30m`. **Add end offset** makes an interval. Offset fields validate while typing and on blur, explaining invalid h/m/s formats, offsets beyond seven days, and end offsets earlier than the start. Without an end value, the time or offset is fixed; with an end value, the start is sampled uniformly between the bounds. Open the ellipsis menu beside **Save step** and select **Advanced settings** to choose weekdays. Use **Every day**, **Weekdays**, **Weekends**, or individual day checkboxes, then **Apply** and **Save step**. Cancel or Escape closes the modal without changing the selection. At least one day is required, and conflicts with related steps are explained before applying.
2. **Entities:** choose **Turn on lights/switches**, **Turn off lights/switches**, **Entity service action**, or **Activate Home Assistant scene**. Select one or more entities for actions, or one scene to activate. Search by friendly name, room or entity ID. Define reusable device states in Home Assistant scenes.
3. **Action:** The action type selector sets whether lights/switches turn on or off. For **Entity service action**, enter a `domain.service` and JSON data. **Activate Home Assistant scene** uses the selected scene’s settings. The step name sits above the editor columns. Use **Activate Home Assistant scene** for brightness, color, or other light settings defined in Home Assistant. Mixed light/switch selections keep light settings separate from switch calls.
4. **Save step** validates with the backend and saves in one action. Errors appear by the relevant field. Newly selected managed lights receive an off baseline and the default handover settings; existing baselines and overrides are preserved.

Warnings about the saved configuration, including shared entity targets, remain visible while navigating, opening or closing step editors, and reloading the panel. Saving changes that resolve an issue removes its warning.

Click a saved step card to expand it, then choose **Add related step** in its ellipsis menu to create what happens before or after it. The parent, entities and days are prefilled; change the timing, entities and weekdays as needed. For example, turn on living-room lights around 18:00, turn on kitchen lights 30 minutes later, then turn everything off two hours after the kitchen step. Offsets follow the parent's sampled scheduled time, including its sampled window, rather than actual device-call completion. Circular choices are excluded. Incompatible weekdays are explained inline.

Click a step card to expand its editor in place. The cards above and below remain visible. The Timing and Action columns appear together; change any combination of fields and select **Save step**. Errors appear beside their fields. **Cancel** collapses the card and discards only that editor's pending changes. Click another card to switch editors. A clean editor closes immediately; pending changes require confirmation before they are discarded. Canceling the prompt keeps the current editor open. Save or cancel pending changes before adding a related step. New steps use the same all-fields layout.

The ellipsis menu beside **Save step** contains **Disable** (or **Enable**), **Add related step**, **Advanced settings**, and **Delete step**. New steps offer **Disable** and **Advanced settings** before saving. **Delete step** opens a confirmation dialog. If other steps depend on the selected step, the dialog names them and blocks deletion until those relationships are changed. Cancel or Escape leaves the draft unchanged. Deletion creates a draft change; **Save changes** validates and applies it. **Discard edits** restores the saved program. Custom actions that the simple editor cannot represent retain their existing restriction and offer their existing related-step and deletion controls in the ellipsis menu when expanded.

**Preview** opens a planner preview without controlling devices. Saving does not enable execution. Use the integration's Home Assistant switches to enable management or select dry-run mode.

## Settings and existing programs

Activation conditions are part of the imported program. Specify exact allowed states, such as `armed` and `armed_away`; `armed away` remains one state containing a space. Multiple entities can require all or any to match; nested and/or/not conditions are available. Empty top-level conditions allow activation whenever management is enabled. Unknown/unavailable dependencies block execution. Home Assistant supplies timezone and location by default; the default schedule day boundary is 02:00.

**Settings** shows Occupied YAML import/export directly. Advanced configuration, including custom activities, lighting handover and defaults/policies, can be edited through exported YAML and imported as a draft.

The editor names timed behaviors **steps**. The builder maps them to existing canonical steps; the version 1 `routines` field remains a compatibility container for defaults, weekdays, activities and windows. It preserves stable IDs, entity targets, container defaults, and unrelated activities/windows. Widening one existing step's days beyond its container creates a separate container with the same inherited settings, leaving its siblings intact.

Every schema field remains available through YAML or JSON import. Durations use h/m/s strings, such as `45m`, `10m` or signed `-30m` offsets. **Save changes** automatically validates, including registered native service schemas, without executing them.

Runtime updates preserve open forms and their focus. Edits made while validation/save waits are retained. Saves include the revision read when editing began; concurrent changes reject stale saves. **Reload saved program** explicitly discards a stale draft. Metadata-only name edits retain sampled times, session and handover/activity deadlines. Behavior changes replace future work while retaining immutable cleanup for already-started activities.

The CLI's `occupied-config rename-id` rewrites typed references when migrating identifiers. Opaque service data stays unchanged. ID changes affect random-stream identity; change names to relabel existing resources without changing today's times.

## Timing and activities

Steps/activities support clock ranges, solar offsets, Home Assistant time sources, and offsets from another step. **Relative to** uses Home Assistant’s generic picker, with live matching results and source details for steps, solar events, Home Assistant times and calendar bounds. It discovers time-bearing datetime helpers and timestamp sensors, including next-alarm sensors; calendars offer start and end. Solar options include sunrise, sunset, dawn, dusk, solar noon and solar midnight. Time-only helpers repeat daily; dated sources use the occurrence HA currently reports. Unknown future calendar events are not guessed. Unavailable sources remain visible when reopening a saved step. The builder edits start and optional end bounds directly and handles midnight crossings. Clearing an end returns to a fixed start time or offset. New builder steps allow crossing the schedule day boundary so related steps can follow an overnight parent. Existing boundary policies remain unchanged. Relationships are shown directly in **Steps**; the backend validates the full graph.

Random windows offer clock/sun/step anchors, cycle counts, duration bounds, gaps, overlap, all/one/subset/weighted targets and concurrency limits. Item weekdays intersect their routine's days. Defaults inherit controller → routine → item; **Inherit** removes an override. Preview reports infeasible schedules instead of silently extending windows.

The **Harmony television preset** selects a remote and its native activity name. It creates a 19:45–20:15 range, fixed 45-minute duration, explicit `remote.turn_on`/`remote.turn_off`, an off-state start condition and `current_activity` ownership predicate. Every resulting field remains editable. Runtime duration starts after the final successful start call; actual deadlines can differ from nominal preview ends. Manual activity changes suppress cleanup. Generic services require explicit ends/resources/data; inverses are never inferred.

## Preview and YAML

**Preview** automatically loads the current schedule date using the same backend planner as the CLI against the draft. Preview never changes runtime permission, plans or devices.

Use the arrows beside the date to move one day backward or forward, or **Today** to return to the current schedule date. Each day loads automatically, and returning to a date retains the same sampled timing for unchanged steps. Day navigation also works when no steps are scheduled.

Preview shows one strip per light or switch using Home Assistant's native history timeline chart. On and off actions share the same strip, with friendly entity names and native state colors, time labels and tooltips. The heading shows the weekday and date. These are planned states, not recorder history. Managed lighting baselines establish initial states; unspecified states are displayed as off. Overlapping window leases and routine/safety priority are reflected in the strips. **Event details** expands the complete action table and revision IDs; other service actions remain available there.

**Settings** imports and exports Occupied YAML/JSON. Edit the code or load a local file, then select **Save changes**. Saving validates YAML, the program schema and installed services before applying the configuration. Invalid code stays in the editor with validation errors; the saved program remains unchanged. Download writes the current code to a local file. Comments are preserved in the open editor but are not retained in the stored program. Managed drafts remain editable for preview/export: the step builder ends with **Add to draft**, while **Save changes** is disabled and file authority is enforced by the backend. See [managed configuration](managed-configuration.md).

The [step example](../examples/steps.yaml) follows Morning → Breakfast with a 10-second to 20-minute interval and includes a scene and a sunrise service action. The [hand-authored example](../examples/house.yaml) and [GUI export](../examples/gui-house.yaml) cover weekdays/weekends, exact states, sun/relative rules, Harmony and lighting handover. Replace virtual entity IDs before use.

## API and compatibility

Commands require an authenticated admin. Entry-specific commands require a loaded `config_entry_id`:

| Command | Purpose / additional fields |
| --- | --- |
| `occupied/instances`, `occupied/instances_subscribe` | List/watch admin instance summaries, source status and shared controlled entities; no entry ID required |
| `occupied/program` | Normalized program, revision, source, resolved date/timezone |
| `occupied/catalog` | Entity names/areas/capabilities, discovered time sources and native service descriptions/selectors |
| `occupied/editor_validate` | Validate `program`, including installed service schemas |
| `occupied/save` | Save `program` with required `expected_revision`; reject `revision_conflict` |
| `occupied/timeline` | Read saved plans/outcomes for optional ISO `date` |
| `occupied/source`, `occupied/reload` | Explicit guarded source selection and validated managed-file reload |
| `occupied/subscribe` | Runtime snapshots through HA's connection subscription API |
| `occupied/validate`, `preview`, `export`, `rename_id` | Shared pure draft operations in [the schema reference](schema.md) |
| `occupied/diagnostics` | Optional `include_sensitive: true` for controller details |

The editor uses Svelte and strict TypeScript and runs only inside Home Assistant. Its generated local ES modules are included in the integration, so installation needs no frontend build or extra runtime dependency. Static assets contain no controller data. The editor follows HA's [custom-panel contract](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels/) and loads HA's native configuration controls before rendering the editor. Entity and time selection use HA selectors; relative sources use HA's generic picker. Controller routing accepts HA's native `config_entry` query parameter; entry discovery and data remain authenticated admin operations. English is complete; Swedish navigation/common controls have English fallback. CI verifies the supported HA matrix, frontend model tests, strict types and generated assets. Check UI behavior in an installed Home Assistant instance.
