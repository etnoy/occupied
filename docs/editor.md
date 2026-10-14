# Occupied editor

Add Occupied through **Settings → Devices & services → Add integration**. Choose a unique controller name, initially Occupied. Setup creates an empty controller with permission disabled. Select **Configure** to open the shared panel. Multiple controllers have independent drafts, permissions, sources, previews, and queues.

## Create and edit steps

**Steps** is the home screen. Choose **Create your first step** or **Create step**. The same inline editor handles creation and updates:

1. **Timing:** choose **Absolute time**, enter the start, and optionally add an end of window. End defines a random start window, not a turn-off time. Earlier end clocks cross midnight automatically. Alternatively, choose **Relative to**, select another step, a solar event, or a discovered HA time source, and enter start and optional end offsets.
2. **Action:** choose turn on lights/switches, turn off lights/switches, entity service action, or activate HA scene. Select entities using HA's native picker. Service actions take `domain.service` and JSON data; scene service data is editable too. Use native HA scenes for reusable device settings.
3. Optionally enter a title. Untitled steps receive display labels without writing a generated title into configuration. Titles are optional when reopening a step too.
4. **Advanced settings** selects weekdays. New and existing steps can be disabled through the ellipsis menu. Omitted days mean every day.
5. **Save step** validates and saves through the backend. Errors appear next to fields. Saving a step does not enable runtime permission.

**Add related step** prefills the parent, entity selection, and weekdays. Dependencies follow the parent's sampled time, even across midnight. The picker excludes circular relationships. Incompatible weekdays are explained inline. A disabled or unavailable parent skips its dependents. Delete is blocked while other steps or random events refer to the selected step.

Click another card to switch editors. Pending changes require a discard decision; cancel retains the form. Save uses the revision read when editing began, so concurrent updates cannot overwrite another editor. Runtime updates preserve open inputs and focus. Metadata-only title/order changes retain sampled plans, sessions, and handover deadlines.

The flat `steps` map is the canonical draft model. Every supported YAML step uses this editor; there are no hidden routine containers, light-management settings, or custom activity cards that cannot be edited.

## Create and edit random events

The separate **Random** tab uses the same inline editing flow as Steps. Choose **Create your first random event** or **Create random event**:

1. Choose **Window starts** using **Absolute time** or **Relative to**. Relative starts can follow steps, solar events, HA time sources, or another random window. Selecting another random window anchors the start to that window’s sampled closing time, rather than its last occurrence. Offsets apply to that closing time; a disabled, unscheduled, or zero-count parent skips the dependent window and any further dependents. **Window ends** offers **Absolute time** or **Duration**. Duration starts counting from the actual sampled window start and supports **Minimum window duration** and **Maximum window duration**; equal values or an empty maximum give a fixed duration. These control the whole window, separately from the event durations below. Circular references are excluded from the picker, and referenced windows cannot be deleted until dependents are changed.
2. Set **Minimum events per window**, **Minimum duration**, and **Maximum duration**. By default, the count is fixed. Choose **Add maximum events** to set an optional **Maximum events per window** and choose a random count between the bounds, including both endpoints. Existing count ranges show both fields. Choose **Remove maximum events** to return to the fixed minimum count. Defaults are three occurrences lasting 5–15 minutes. Counts must be whole numbers from 0 to 1000, with maximum at least minimum. Set the minimum to zero and add a positive maximum to allow windows with no activity; zero to one gives an equal chance of skipping or running once. A fixed zero always skips. Skipped windows also skip dependent random events. A live explanation describes the selected window, weekdays, count, duration, and start/end actions. Durations use `h`, `m`, and `s`, such as `10m` or `1h30m`.
3. Choose actions **When event starts** and **When event ends**. Both support lights/switches, covers, scenes, and native service actions. **Control covers** offers open/close/stop, position, and tilt commands, with a cover-only entity picker. Position and tilt use whole percentages from 0 (closed) to 100 (open). When both actions control covers, **Use the same entities** shares their targets while keeping each command independent. Uncheck it for separate targets, or choose a different end scene/service.
4. Optionally add a title, use **Enable**/**Disable** in the ellipsis menu at the bottom, or choose **Advanced settings** above **Frequency and duration** to select weekdays. Choose **Apply** to keep the weekday selection; **Cancel** discards dialog edits.
5. Choose **Save random event**. Validation, unsaved-change protection, revision guards, and managed-file drafts work as they do for Steps. Reopen a card to edit it; **Delete random event** in the ellipsis menu removes the definition through the same guarded save flow.

Each occurrence receives a random start and duration and finishes inside its window. **Duration limits take precedence over the event count:** events are never shortened below the minimum or extended beyond the maximum to meet a count. Events may overlap, so a 30-minute window can still contain five events lasting 20–25 minutes each. A maximum longer than the window is limited to the available time. If a positive count is sampled and even one event at the minimum duration cannot fit, no events are scheduled for that definition and the date is reported as infeasible: a 4-minute window with a 5-minute minimum does not run shortened events when at least one occurrence is selected. A sampled zero skips window resolution and reports an informational skip, keeping the date feasible; returning to the same date preserves the choice. An absolute end clock earlier than the start continues into the next local date. Window durations measure elapsed time from the sampled start, including across midnight and daylight-saving changes. Previously saved relative window ends remain readable; choose Absolute time or Duration to replace them in the editor.

In Steps, choose **Control covers** under **Step type** for the same controls. Each command saves as its native service, such as `cover.set_cover_position` with `data: {position: 60}` or `cover.set_cover_tilt_position` with `data: {tilt_position: 25}`. Open/close/stop commands need no data. Existing standard cover actions reopen in these controls; custom cover services or additional payload fields remain editable through **Entity service action**. Device capabilities and installed HA services determine which commands work.

Covers execute only future scheduled calls. Enabling late skips past cover actions and leaves the current position alone. Controller stop cancels future work and does not send a cover stop or restore earlier positions; author a **Stop cover** or **Stop tilt** action when needed.

## YAML and managed files

**Settings** shows the YAML editor directly. Load a YAML/JSON file or edit the code and choose **Save changes**. Saving validates YAML, schema, dependencies, and installed services before applying changes. Invalid code remains in the editor and leaves the saved program intact. **Download** saves the current text. Comments remain in the open editor but are not stored in the canonical program.

In managed-file mode, both editors finish with **Add to draft**. The draft remains available for preview/export, while **Save changes** is disabled and file authority is enforced by the backend. Deploy the exported YAML and reload the managed source. Importing a local browser file does not make that file authoritative. See [managed configuration](managed-configuration.md).

All-week selections, normal enabled state, zero offsets, empty data, and equal end bounds are omitted from export. Stable IDs are mapping keys; changing a title never changes its key. Use the CLI/API typed rename operation when changing an ID.

## Preview

**Preview** automatically loads the selected local calendar date. Use date arrows or Today. Sampling remains stable when returning to a date. Neighboring source-date plans supply overnight events on their actual calendar date. Device strips show planned states, with Unknown before the first known action. These are plans rather than current HA state or recorder history. Opaque scenes/services do not invent resulting device state. Event details show native service names and targets.

Cover strips show independently authored position and tilt targets. Open and close establish 100% and 0% targets. Stop makes its affected axis Unknown, while preserving the other axis's known target. Travel time and intermediate positions are not inferred. An opaque call on an explicit cover target makes both axes Unknown.

Preview reads known HA time-source snapshots but never invokes device services or changes runtime permission/queues. Time-only helpers repeat daily; dated helper/sensor/calendar values use their reported occurrence. Future calendar events are not guessed. Solar events are calculated for the selected date and configured HA location.

## Backend operations

Admin WebSocket operations require `config_entry_id`: `occupied/program`, `catalog`, `editor_validate`, `save`, `preview`, `export`, `rename_id`, `timeline`, `subscribe`, `source`, and `reload`. Draft operations accept canonical JSON or YAML. Save/apply use expected revisions. Discovery and subscriptions expose controller-specific status and warnings for shared controlled entities. See [schema](schema.md) and [runtime](runtime.md).
