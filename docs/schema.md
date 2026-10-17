# Occupied configuration schema

The GUI, JSON API, YAML loader, CLI, and runtime use the same step and random-event model. The schema remains `schema_version: 1` during greenfield development. The generated contract is [occupied.schema.json](../schema/occupied.schema.json).

## Program and steps

`schema_version: 1` and `name` are required. The optional `steps` and `random` mappings are keyed by stable IDs. Omitting both creates an empty controller.

```yaml
schema_version: 1
name: Occupied
steps:
  evening:
    timing:
      absolute_time: {start: '18:00', end: '18:30'}
    action: turn_on
    entities: [light.living_room, switch.table_lamp]
  bedtime:
    timing:
      relative_to: {step: evening, start_offset: 2h}
    action: turn_off
    entities: [light.living_room, switch.table_lamp]
```

Each step requires `timing` and either a singular `action` with nonempty `entities`, or a nonempty ordered `actions` list. Custom `set_state` actions use an entity-keyed mapping; existing actions use target lists. Optional fields are `name`, `enabled` (default true), `days` (default every day), and `data` (default empty mapping). Titles are optional during both creation and editing. The GUI computes display labels for untitled steps without storing them. IDs match `[a-z][a-z0-9_-]*`, appear once as mapping keys, and remain independent of titles.

Weekdays are `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, and `sun`. A supplied list must not be empty. Entity IDs use HA's `domain.object_id` form. Entity members are deduplicated and sorted. Authored step order is preserved for presentation; changing it does not change sampling or dispatch order.

## Step timing limits

Available in the current development build with `schema_version: 1`; earlier builds without these fields reject them. Keep exactly one base timing branch and optionally add either or both modifiers:

```yaml
timing:
  relative_to: {sun: sunset, start_offset: -90m}
  latest_at:
    absolute_time: {start: '18:00'}
# Or run at 05:30 only before the same date's sunrise plus 90 minutes:
# timing:
#   absolute_time: {start: '05:30'}
#   only_before:
#     relative_to: {sun: sunrise, start_offset: 90m}
```

`latest_at` caps the sampled instant at the boundary. `only_before` keeps it only when the resulting instant is **strictly before** its boundary; equality skips. When both are configured, apply the cap first, then the condition. A randomized base samples once: values beyond the cap land on the cap, and excluded values skip without resampling. These modifiers apply to scheduled steps only; random window starts and ends reject them.

Each boundary accepts exactly one quoted `absolute_time.start` clock or `relative_to.sun` event with an optional signed `start_offset`. All six solar events are supported. Ranges, `end`, `end_offset`, durations, step/entity/random references, nested modifiers, explicit nulls, and unknown fields are rejected. Clock and offset validation follows the existing timing rules.

Boundaries belong to the schedule's **source local date** and HA location, even when an offset crosses midnight. Earlier clock boundaries do not roll to the next day. Comparisons use UTC instants; repeated clocks use the first occurrence and nonexistent clocks advance to the first valid instant. Calendar previews place actions on their actual local date while retaining the source date and weekday selection. Solar events are calculated for that source date, rather than read from `sun.sun`'s next-event attributes. An unavailable base solar event or solar boundary skips the step; a clock cap is never a fallback. Missing timezone or location follows normal planning validation.

Preview explains adjusted instants and strict-condition skips, including field paths and the candidate/boundary/adjusted instants. A skipped step creates no actions, stagger ticks, dependent anchor, lighting intent, startup target, or live-preview event. Dependents follow the capped time or skip with an unavailable anchor. Conditions are evaluated while planning; late execution does not compare against the current wall clock. Permission, pause, run-condition, missed-event, and manual-control policies still apply.

Timing modifier edits change behavior hashes; title edits do not. Configurations without modifiers retain their normalized hashes and seeded samples. Scheduled occurrence journals retain source-date step identity across timing edits, replanning, reloads, and restarts; obsolete plan caches are regenerated without replaying completed calls.

See [solar-limits.yaml](../examples/solar-limits.yaml) for both lighting rules with their original targets and brightness settings. Review these steps in the existing controller with management disabled before coordinating any replacement of Home Assistant automations.

## Optional run condition

Available in the current development build; earlier builds without this field reject it. Omit `run_condition` to retain ordinary activation and light handover.

```yaml
run_condition:
  entity_id: alarm_control_panel.alarm
  state: [armed_away, armed_night]
  enforce_state_on_start: true
  start_delay: 30s
  off_entities: [light.bathroom, switch.utility_room]
```

`entity_id` accepts any entity domain. `state` is one nonempty string or a nonempty list, matching any of the exact HA state values; duplicate states are removed. Quote values such as `"on"` and `"off"` in YAML. Missing, `unknown`, and `unavailable` entities block execution; those last two values cannot be allowed states.

`enforce_state_on_start` is a strict boolean, default `false`, controlled by **Enforce expected state on start** in Settings → Run condition and saved in the program. With the setting off, a matching condition starts future scheduled execution without historical reconciliation. With the setting on, all new scheduled device writes wait for `start_delay`, then Occupied applies supported known targets at that time. The delay remains in Settings and canonical YAML, defaults to `30s`, allows `0s` through `1h`, and uses explicit duration units; bare numbers are rejected. A customized delay is retained but unused when enforcement is off.

Select **Extra entities to turn off** below the enforcement delay to add lights and switches outside your steps and events, such as windowless bathroom lights. These are turned off during startup enforcement after the delay, and by the **Enforce expected state** button. The list is saved as `run_condition.off_entities` (default `[]`); duplicate IDs are removed. Entities declared in any step or event, including disabled ones, keep their scheduled behavior. Unavailable and already-off entities are skipped. Manual changes yield an extra entity until the next activation or explicit enforcement; the list does not continuously force devices off.

Permission and pause still apply. Allowed-state transitions do not restart an activation. Condition loss cancels further work without any device commands, including transition holds or cover stops. Editing the policy preserves sampled schedules and completed event identities.

## Timing

Choose exactly one `timing.absolute_time` or `timing.relative_to` branch. The GUI calls these **Absolute time** and **Relative to**.

Absolute timing requires `start`, with optional `end`. These delimit the window in which one action occurs. End is not an off action or a duration. Omitting end, or choosing equal bounds, creates a fixed time. An end before start automatically means the next day. Start sampling is uniform.

Clock strings must be quoted `HH:MM` or `HH:MM:SS`. Export removes zero seconds and equal end bounds, retaining meaningful seconds.

Relative timing chooses exactly one typed source:

```yaml
timing:
  relative_to:
    step: evening
    start_offset: 30m
    end_offset: 1h
# Alternative sources:
# relative_to: {sun: sunset, start_offset: -30m, end_offset: 10m}
# relative_to: {entity: input_datetime.alarm}
# relative_to: {entity: sensor.phone_next_alarm, start_offset: -10m}
# relative_to: {entity: calendar.work, attribute: start_time}
```

`start_offset` defaults to `0s`; an omitted end offset equals the start offset. End must be at least start. Durations use signed, ordered h/m/s units such as `10s`, `20m`, `2h30m`, or `-1.5s`. Each offset must be finite and within seven days. Bare numbers and colon durations are rejected.

Step sources reference the parent's sampled time, using elapsed UTC offsets, rather than actual service completion. Cycles and missing IDs are errors. Each step's weekdays can be edited independently. A dependent step runs only on source dates selected by both it and its parent. A disabled, unavailable, or unscheduled parent skips dependent occurrences without changing their weekday selections.

Solar sources support sunrise, sunset, dawn, dusk, noon, and midnight. Dawn/dusk are civil twilight. Solar events are calculated for the requested date and location; unavailable events skip the step and its dependents with an explanation.

HA sources support time-bearing datetime helpers, timestamp sensors, and calendars. Calendar sources require `attribute: start_time` or `end_time`. Time-only helpers repeat daily. Dated sources use only the occurrence HA reports and are not projected onto unknown future dates. Missing or unavailable values skip the step with a warning. Offline previews have no HA snapshot. Source changes reschedule future work without replaying completed steps for the same source date.

## Random events

The `random` map defines repeated activity inside a window. The GUI edits it in its own **Random** tab:

```yaml
random:
  living_room:
    start: {absolute_time: {start: '18:00'}}
    end: {absolute_time: {start: '23:00'}}
    min_duration: 5m
    max_duration: 15m
    count: {min: 2, max: 6}
    'on': {action: turn_on, entities: [light.living_room]}
    'off': {action: turn_off, entities: [light.living_room]}
```

`start` accepts absolute times, steps (`relative_to: {step: evening}`), solar events, HA time sources, or another random window (`relative_to: {random: living_room}`). A random reference follows that window's sampled **closing time**, with optional signed start/end offsets; it does not follow the last occurrence's end. Dependencies resolve in order for the same source date. Disabled, unscheduled, unavailable, infeasible, or zero-count parents skip their dependents, including further dependent windows in the chain. Random references are only allowed on a random window start. Missing references and cycles are rejected; renaming a random ID rewrites these typed references.

The window-end editor offers absolute time or duration. Use `end: {absolute_time: {start: '23:00'}}` for a clock end, with optional randomized clock bounds. Use `end: {duration: {min: 30m, max: 1h}}` to sample an elapsed window length from the actual sampled start. Durations are positive h/m/s values within seven days, with maximum at least minimum; an omitted or equal maximum gives a fixed length. This window length is separate from each occurrence's `min_duration`/`max_duration`. An earlier absolute end rolls into the next local date. Existing `relative_to` ends remain readable for compatibility, but are no longer offered by the editor.

A chained window can be configured as follows:

```yaml
random:
  living_room:
    start: {absolute_time: {start: '18:00'}}
    end: {duration: {min: 1h, max: 2h}}
    'on': {action: turn_on, entities: [light.living_room]}
    'off': {action: turn_off, entities: [light.living_room]}
  hallway:
    start: {relative_to: {random: living_room, start_offset: 10m}}
    end: {duration: {min: 30m, max: 1h}}
    'on': {action: turn_on, entities: [light.hallway]}
    'off': {action: turn_off, entities: [light.hallway]}
```

The hallway window opens ten minutes after the living-room window closes, regardless of when its individual occurrences finish.

`min_duration` and `max_duration` are positive h/m/s durations within seven days, defaulting to `5m` and `15m`. Maximum must be at least minimum. `count` accepts a fixed integer or a range such as `{min: 2, max: 6}`. Fixed counts and both range bounds are whole numbers from 0 to 1000, with maximum at least minimum. The count is sampled uniformly from the inclusive range independently for each window. An omitted count defaults to 3; existing integer counts remain fixed. Equal range bounds normalize to a fixed integer. Planning budgets use the maximum count. Optional `name`, `enabled`, and `days` follow the step defaults. `on` and `off` each require either a singular action and entities, with optional service data, or an `actions` list, using the same action validation as steps. Either phase can activate a scene or call a native entity service.

Set `count: {min: 0, max: 1}` for an equal chance of zero or one occurrence per selected window, or use a larger maximum for zero or more occurrences. Every integer in the inclusive range is equally likely. `count: 0` (including `{min: 0, max: 0}`) always generates no actions. The count uses its own seeded sampling stream, so revisiting the same source date with the same seed produces the same choice; titles, definition order, and unrelated definitions do not change it or move occurrence times. A sampled zero records an informational skip before resolving the window, so unavailable timing sources or a window too short for an occurrence do not make that skipped date infeasible. No closing-time anchor is exposed, and dependent random windows skip that source date. Positive samples still require a feasible window.

Each occurrence independently samples its duration and start time. **Duration bounds take precedence over `count`:** the planner never shortens an occurrence below `min_duration` or extends it above `max_duration` to satisfy a fixed count or count range. Both actions stay inside the resolved window, so the effective maximum is `min(max_duration, window_length)`. If a positive count is sampled and `min_duration` exceeds the resolved window length, no occurrences are generated for that definition and the date is infeasible, even if the count requires one or more events. Equal durations are supported. Overlap is allowed and does not reduce the sampled count when individual occurrences fit; an end action may run while another occurrence is active. For example, a 30-minute window with a count of 5 and durations of 20–25 minutes produces overlapping events within those duration bounds, while a 4-minute window with a 5-minute minimum produces a duration error instead of shortened events. Sampling streams are stable per ID and occurrence; titles, presentation order, and unrelated definitions do not move sampled times. Step ID renames update both boundary references. Random IDs can be renamed using the CLI/API `random` kind.

## Dates, context, and DST

Timezone and location come from HA, or CLI context flags (`--timezone`, `--latitude`, `--longitude`, `--elevation`). They are not duplicated in program YAML. Offline dated previews require timezone context; solar steps also require location.

A schedule date begins at local midnight. Weekdays select the source date: a Monday 23:50 step plus 30m runs Tuesday 00:20 as Monday's occurrence. Overnight absolute windows follow the same rule. Internal times are aware UTC. Repeated DST clocks use their first occurrence; nonexistent clocks advance to the first valid instant, with a warning. Calendar days can have 23 or 25 hours.

Live compilation has bounded date and event budgets. Excessively long dependency chains or oversized plans fail explicitly instead of silently dropping work.

## Actions

`turn_on` and `turn_off` accept lights and switches. Mixed selections remain one configured step; the planner resolves per-domain service calls internally. Shorthand actions take no service data: use an entity service action or HA scene for light settings.

A qualified `domain.service`, such as `light.turn_on`, `cover.set_cover_position`, or `script.turn_on`, accepts a native JSON-compatible `data` mapping. The GUI edits generic mappings as JSON and offers dedicated cover controls for standard native commands. `cover.open_cover`, `cover.close_cover`, `cover.stop_cover`, and their `_tilt` variants take no data; `cover.set_cover_position` uses `data: {position: 60}`, and `cover.set_cover_tilt_position` uses `data: {tilt_position: 25}`. The cover editor accepts whole percentages from 0 (closed) to 100 (open). These controls use the existing service representation without new YAML fields. Typed light/switch actions validate their domain and payload. Brightness zero is rejected; use turn off. Light data accepts brightness or brightness_pct, one color mode, and transition. Switch control does not accept light payloads.

`scene.turn_on` selects one HA scene and optionally accepts service data. Scene and generic service effects are opaque: Occupied does not infer changed lights, inverses, or cleanup. Native HA service schemas are checked during GUI validation/save without executing services. Put entity selection in `entities`; target selectors in `data` are rejected.

The **Custom YAML** action choice accepts one action mapping or an ordered list. It generates equivalent YAML from the current simple controls, supports scene-style individual light/switch/cover settings through `set_state`, and saves the block under `actions`. All members share one sampled time and execute in list order; a failed call stops remaining calls without rollback or whole-block retry. Related steps still model actions with separate scheduled times; random events pair start/end phases. See [Custom YAML actions](custom-yaml.md) for syntax, supported fields, conversion, and validation rules. There are no routine containers, inherited defaults, probability, stagger, weighted targets, or configurable sampling distributions.

## Projection and runtime

Controlled entities are derived from enabled steps and both actions of enabled random events. Only direct typed light intents participate in handover. Default handover state starts Unknown for each local date until a scheduled action establishes intent; activation leaves unknown state alone. An explicit midnight step can establish an initial state. Explicit state enforcement, both on startup and through the enforcement button, also considers known targets from the preceding local calendar day, preserving overnight intent without replaying historical actions. Scenes/services remain opaque and do not supply inferred baselines.

On without brightness keeps known desired brightness or delegates brightness to HA/the device. It never inserts a default percentage. Handover uses one internal ten-minute default and HA capabilities for native transitions or bounded fallback calls. Outside manual changes yield that entity until its next scheduled action or the next activation. Stopping leaves states and holds still-owned native fades at the observed level.

Permission and pause are HA controls. HA automations can drive permission using their own conditions. These runtime controls are not YAML step fields. The optional program-level `run_condition` controls eligibility and startup state enforcement. Historical generic actions are never replayed; service calls are journaled durably before dispatch.

Standard cover commands provide independent position/tilt targets for preview. A stop clears its affected target because the actual stopped position is unknown. Cover activation is **future only** by default; the **Enforce expected state on start** setting also reconciles known cover axes when a run condition is configured. With the setting off, past calls are skipped, even when preview has a known target. Covers never participate in light handover; historical movement requires explicit startup enforcement. Outside changes to `current_position` or `current_tilt_position` yield the entity until its next scheduled action or the next activation. Controller stop leaves cover movement to the device and does not implicitly send a stop or restore call.

## Validation, export, and identity

Unknown/retired fields, duplicate YAML keys, unsafe tags, recursive aliases, and YAML merge keys are rejected. Errors include model paths such as `steps.evening.timing.absolute_time.start` and YAML source locations.

Export omits all-week selections, enabled true, zero offsets, equal ends, empty data, and internal defaults. Unicode and presentation order are preserved; opaque payload contents and list ordering remain untouched. Repeated export/import stabilizes after one normalization.

The behavior hash identifies sampled schedule behavior and excludes run-condition policy, titles, and presentation order. Run-condition policy changes update the source revision and activation lifecycle without changing sampled event identities. Explicit equivalent defaults have the same hash. Source revision separately includes metadata and presentation order. Metadata-only saves retain sampled times and active handover deadlines. Random streams are keyed by source date and stable step ID, so unrelated steps do not shift existing choices.

`occupied rename-id FILE step OLD NEW` and `occupied/rename_id` atomically rename a key and its typed step references. Opaque data is not rewritten. Renaming an ID selects a new random stream; changing a title does not. 

### Staggered actions

A singular eligible action may contain a `stagger` mapping beside `action`, `entities`, and `data`:

```yaml
stagger:
  enabled: true
  period: 2m
```
 `enabled` is a strict boolean, defaults to false, and `period` defaults to `2m`; durations range from `1s` through `30m`. An `actions` wrapper cannot carry `stagger`; individual members may. The feature supports explicit light/switch on and off targets, including mixed `set_state` mappings. Advanced settings exposes the checkbox and editable time window, defaulting to `2m`. Four targets over two minutes receive ticks at +30/+60/+90/+120 seconds in one freshly shuffled order. See [Custom YAML](custom-yaml.md#staggered-action) for list ordering, random-window rules, and examples. Older releases without staggering support reject the new field.
