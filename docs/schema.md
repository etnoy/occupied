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

Each step requires `timing`, `action`, and a nonempty `entities` list. Optional fields are `name`, `enabled` (default true), `days` (default every day), and `data` (default empty mapping). Titles are optional during both creation and editing. The GUI computes display labels for untitled steps without storing them. IDs match `[a-z][a-z0-9_-]*`, appear once as mapping keys, and remain independent of titles.

Weekdays are `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, and `sun`. A supplied list must not be empty. Entity IDs use HA's `domain.object_id` form. Entity members are deduplicated and sorted. Authored step order is preserved for presentation; changing it does not change sampling or dispatch order.

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
    count: 3
    'on': {action: turn_on, entities: [light.living_room]}
    'off': {action: turn_off, entities: [light.living_room]}
```

`start` and `end` each use the same timing model as steps. They can reference a step (`relative_to: {step: evening}`), a solar event, or a known HA time source, and can themselves have random bounds. Step boundaries follow that source date's sampled step times. Disabled, unscheduled, or unavailable boundaries skip the random event. An earlier recurring clock, solar, or time-only helper end rolls into the next local date; step and dated-source boundaries must already be chronological.

`min_duration` and `max_duration` are positive h/m/s durations within seven days, defaulting to `5m` and `15m`. Maximum must be at least minimum. `count` is an integer from 1 to 1000, defaulting to 3. Optional `name`, `enabled`, and `days` follow the step defaults. `on` and `off` each require an action and entities, with optional service data, using the same action validation as steps. Either phase can activate a scene or call a native entity service.

Each occurrence independently samples its duration and start time. Both actions stay inside the resolved window; maximum duration is limited by the available window, and a minimum that cannot fit makes the date infeasible. Equal durations are supported. Overlap is allowed, so an end action may run while another occurrence is active. Sampling streams are stable per ID and occurrence; titles, presentation order, and unrelated definitions do not move sampled times. Step ID renames update both boundary references. Random IDs can be renamed using the CLI/API `random` kind.

## Dates, context, and DST

Timezone and location come from HA, or CLI context flags (`--timezone`, `--latitude`, `--longitude`, `--elevation`). They are not duplicated in program YAML. Offline dated previews require timezone context; solar steps also require location.

A schedule date begins at local midnight. Weekdays select the source date: a Monday 23:50 step plus 30m runs Tuesday 00:20 as Monday's occurrence. Overnight absolute windows follow the same rule. Internal times are aware UTC. Repeated DST clocks use their first occurrence; nonexistent clocks advance to the first valid instant, with a warning. Calendar days can have 23 or 25 hours.

Live compilation has bounded date and event budgets. Excessively long dependency chains or oversized plans fail explicitly instead of silently dropping work.

## Actions

`turn_on` and `turn_off` accept lights and switches. Mixed selections remain one configured step; the planner resolves per-domain service calls internally. Shorthand actions take no service data: use an entity service action or HA scene for light settings.

A qualified `domain.service`, such as `light.turn_on`, `cover.set_cover_position`, or `script.turn_on`, accepts a native JSON-compatible `data` mapping. The GUI edits that mapping as JSON. Typed light/switch actions validate their domain and payload. Brightness zero is rejected; use turn off. Light data accepts brightness or brightness_pct, one color mode, and transition. Switch control does not accept light payloads.

`scene.turn_on` selects one HA scene and optionally accepts service data. Scene and generic service effects are opaque: Occupied does not infer changed lights, inverses, or cleanup. Native HA service schemas are checked during GUI validation/save without executing services. Put entity selection in `entities`; target selectors in `data` are rejected.

One step has one action. Related steps model subsequent scheduled actions; random events pair start/end actions for repeated occurrences. There are no routine containers, inherited defaults, multi-action lists, probability, stagger, weighted targets, or configurable sampling distributions.

## Projection and runtime

Controlled entities are derived from enabled steps and both actions of enabled random events. Only direct typed light intents participate in handover. State starts Unknown for each local date until a scheduled action establishes intent; activation leaves unknown state alone. An explicit midnight step can establish an initial state. Scenes/services remain opaque and do not supply inferred baselines.

On without brightness keeps known desired brightness or delegates brightness to HA/the device. It never inserts a default percentage. Handover uses one internal ten-minute default and HA capabilities for native transitions or bounded fallback calls. Outside manual changes yield that entity until the next activation. Stopping leaves states and holds still-owned native fades at the observed level.

Permission, pause, and dry run are HA controls. HA automations can drive permission using their own conditions. These runtime controls and activation policy choices are not YAML step fields. Historical generic actions are never replayed; service calls are journaled durably before dispatch.

## Validation, export, and identity

Unknown/retired fields, duplicate YAML keys, unsafe tags, recursive aliases, and YAML merge keys are rejected. Errors include model paths such as `steps.evening.timing.absolute_time.start` and YAML source locations.

Export omits all-week selections, enabled true, zero offsets, equal ends, empty data, and internal defaults. Unicode and presentation order are preserved; opaque payload contents and list ordering remain untouched. Repeated export/import stabilizes after one normalization.

The behavior hash includes effective step behavior and excludes titles and presentation order. Explicit equivalent defaults have the same hash. Source revision separately includes metadata and presentation order. Metadata-only saves retain sampled times and active handover deadlines. Random streams are keyed by source date and stable step ID, so unrelated steps do not shift existing choices.

`occupied-config rename-id FILE step OLD NEW` and `occupied/rename_id` atomically rename a key and its typed step references. Opaque data is not rewritten. Renaming an ID selects a new random stream; changing a title does not. See [editor](editor.md), [runtime](runtime.md), and [managed configuration](managed-configuration.md).
