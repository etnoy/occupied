# Occupied editor

Add Occupied through **Settings → Devices & services → Add integration**. Choose a unique controller name, initially Occupied. Setup creates an empty controller with permission disabled. Select **Configure** to open the shared panel. Multiple controllers have independent drafts, permissions, sources, previews, and queues.

## Create and edit steps

**Steps** is the home screen. Choose **Create your first step** or **Create step**. The same inline editor handles creation and updates:

1. **Timing:** choose **Absolute time**, enter the start, and optionally add an end of window. End defines a random start window, not a turn-off time. Earlier end clocks cross midnight automatically. Alternatively, choose **Relative to**, select another step, a solar event, or a discovered HA time source, and enter start and optional end offsets.
2. **Action:** choose turn on lights/switches, turn off lights/switches, entity service action, or activate HA scene. Select entities using HA's native picker. Service actions take `domain.service` and JSON data; scene service data is editable too. Use native HA scenes for reusable device settings.
3. Optionally enter a title. Untitled steps receive display labels without writing a generated title into configuration. Titles are optional when reopening a step too.
4. **Advanced settings** selects weekdays. New and existing steps can be disabled through the ellipsis menu. Omitted days mean every day.
5. **Save step** validates and saves through the backend. Errors appear next to fields. Saving a step does not enable runtime permission.

**Add related step** prefills the parent, entity selection, and weekdays. Dependencies follow the parent's sampled time, even across midnight. The picker excludes circular relationships. Incompatible weekdays are explained inline. A disabled or unavailable parent skips its dependents. Delete is blocked while other steps refer to the selected step.

Click another card to switch editors. Pending changes require a discard decision; cancel retains the form. Save uses the revision read when editing began, so concurrent updates cannot overwrite another editor. Runtime updates preserve open inputs and focus. Metadata-only title/order changes retain sampled plans, sessions, and handover deadlines.

The flat `steps` map is the canonical draft model. Every supported YAML step uses this editor; there are no hidden routine containers, light-management settings, or custom activity cards that cannot be edited.

## YAML and managed files

**Settings** shows the YAML editor directly. Load a YAML/JSON file or edit the code and choose **Save changes**. Saving validates YAML, schema, dependencies, and installed services before applying changes. Invalid code remains in the editor and leaves the saved program intact. **Download** saves the current text. Comments remain in the open editor but are not stored in the canonical program.

In managed-file mode, the step editor finishes with **Add to draft**. The draft remains available for preview/export, while **Save changes** is disabled and file authority is enforced by the backend. Deploy the exported YAML and reload the managed source. Importing a local browser file does not make that file authoritative. See [managed configuration](managed-configuration.md).

All-week selections, normal enabled state, zero offsets, empty data, and equal end bounds are omitted from export. Stable IDs are mapping keys; changing a title never changes its key. Use the CLI/API typed rename operation when changing an ID.

## Preview

**Preview** automatically loads the selected local calendar date. Use date arrows or Today. Sampling remains stable when returning to a date. Neighboring source-date plans supply overnight events on their actual calendar date. Device strips show planned states, with Unknown before the first known action. These are plans rather than current HA state or recorder history. Opaque scenes/services do not invent resulting device state. Event details show native service names and targets.

Preview reads known HA time-source snapshots but never invokes device services or changes runtime permission/queues. Time-only helpers repeat daily; dated helper/sensor/calendar values use their reported occurrence. Future calendar events are not guessed. Solar events are calculated for the selected date and configured HA location.

## Backend operations

Admin WebSocket operations require `config_entry_id`: `occupied/program`, `catalog`, `editor_validate`, `save`, `preview`, `export`, `rename_id`, `timeline`, `subscribe`, `source`, and `reload`. Draft operations accept canonical JSON or YAML. Save/apply use expected revisions. Discovery and subscriptions expose controller-specific status and warnings for shared controlled entities. See [schema](schema.md) and [runtime](runtime.md).
