# Occupied YAML reference

This reference describes the complete program YAML accepted by Occupied's GUI, JSON API, YAML loader, CLI, and runtime. The current format is `schema_version: 1`. The generated [JSON Schema](../schema/occupied.schema.json) describes the model; the loader and validator also enforce the cross-field and runtime rules below. Older builds may reject newer version-1 fields such as custom actions, staggering, timing limits, and run conditions.

A program file contains the program mapping directly. The GUI's **Settings** YAML editor accepts a complete program; the **Custom YAML** action editor accepts only an action mapping or list. See [Custom YAML action editor](#custom-yaml-action-editor) for that distinction and [Managed files](#managed-files) for Home Assistant's separate `configuration.yaml` wrapper.

- [Program fields](#program-fields)
- [Steps](#steps)
- [Timing](#timing)
- [Step timing limits](#step-timing-limits)
- [Run condition](#run-condition)
- [Random events](#random-events)
- [Dates, context, and DST](#dates-context-and-dst)
- [Actions](#actions)
- [Validation, editing, and export](#validation-editing-and-export)
- [Projection and runtime](#projection-and-runtime)
- [Managed files](#managed-files)

## Program fields

| Field | Required | Accepted value / default |
| --- | --- | --- |
| `schema_version` | Yes | The integer `1`; strings, booleans, and other versions are rejected. |
| `name` | Yes | Controller name as a string. |
| `steps` | No | Mapping of stable IDs to scheduled steps. Defaults to an empty mapping. |
| `random` | No | Mapping of stable IDs to random events. Defaults to an empty mapping. |
| `run_condition` | No | Execution policy described under [Run condition](#run-condition). Omit it for ordinary activation and light handover. |

Omitting both `steps` and `random` creates an empty controller. A program supports at most 5000 steps and random events combined. Unknown fields are rejected throughout the typed configuration; generic service `data` is checked according to its service.

IDs match `[a-z][a-z0-9_-]*`, appear once as mapping keys, and remain independent of optional display names. Step references resolve in `steps`; random references resolve in `random`. Renaming a display name does not rename an ID or change its sampled schedule.

## Steps

A step schedules one action or ordered block at one fixed or sampled time:

```yaml
schema_version: 1
name: Occupied
steps:
  evening:
    timing:
      absolute_time:
        start: '18:00'
        end: '18:30'
    action: turn_on
    entities:
      - light.living_room
      - switch.table_lamp
  bedtime:
    timing:
      relative_to:
        step: evening
        start_offset: 2h
    action: turn_off
    entities:
      - light.living_room
      - switch.table_lamp
```

| Field | Required | Accepted value / default |
| --- | --- | --- |
| `timing` | Yes | Exactly one `absolute_time` or `relative_to` source, with optional step timing limits. |
| `name` | No | Display name. Whitespace is trimmed; an empty name is treated as omitted. |
| `enabled` | No | Strict boolean, default `true`. |
| `days` | No | Nonempty list of weekdays, default every day. |
| `action`, `entities` | One action form | A singular action with nonempty targets. Optional `data` defaults to an empty mapping; optional `stagger` uses the defaults below. |
| `actions` | One action form | Nonempty ordered list of action mappings. Cannot be combined with singular `action`, `entities`, `data`, or `stagger` fields. |

Use singular fields for a simple action, or `actions` for a block, including a single custom action. See [Actions](#actions) for the supported action types and target shapes.

Weekdays are `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, and `sun`. Duplicates are removed and days normalize to weekday order. Titles are optional during both creation and editing; the GUI computes labels for untitled steps without storing them. Authored step order is preserved for presentation; changing it does not change sampling or dispatch order.

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
# relative_to:
#   sun: sunset
#   start_offset: -30m
#   end_offset: 10m
# relative_to:
#   entity: input_datetime.alarm
# relative_to:
#   entity: sensor.phone_next_alarm
#   start_offset: -10m
# relative_to:
#   entity: calendar.work
#   attribute: start_time
```

`start_offset` defaults to `0s`; an omitted end offset equals the start offset. End must be at least start. Durations use signed, ordered h/m/s units such as `10s`, `20m`, `2h30m`, or `-1.5s`. Each offset must be finite and within seven days. Bare numbers and colon durations are rejected.

Step sources reference the parent's sampled time, using elapsed UTC offsets, rather than actual service completion. Cycles and missing IDs are errors. Each step's weekdays can be edited independently. A dependent step runs only on source dates selected by both it and its parent. A disabled, unavailable, or unscheduled parent skips dependent occurrences without changing their weekday selections.

Solar sources support sunrise, sunset, dawn, dusk, noon, and midnight. Dawn/dusk are civil twilight. Solar events are calculated for the requested date and location; unavailable events skip the step and its dependents with an explanation. Solar anchors use the requested local schedule date, including civil time zones east of the international date line whose longitudes are west of 180°. Solar midnight follows Astral’s occurrence nearest the date’s 00:00 and can fall shortly before civil midnight.

HA entity sources accept `input_datetime.*` helpers with a time component, `sensor.*` timestamp sensors, and `calendar.*` entities. Other entity domains are rejected as time sources. Calendar sources require `attribute: start_time` or `end_time`. Time-only helpers repeat daily. Dated sources use only the occurrence HA reports and are not projected onto unknown future dates. Missing or unavailable values skip the step with a warning. Offline previews have no HA snapshot. Source changes reschedule future work without replaying completed steps for the same source date.

Once a reported anchor instant is reached, Occupied retains it for that source date while the date remains in the runtime planning window, including across restarts. A calendar advancing to its next event therefore preserves offsets that run after midnight. Changes reported before the anchor instant still reschedule its work.

## Step timing limits

Keep exactly one base timing branch and optionally add either or both modifiers:

```yaml
timing:
  relative_to:
    sun: sunset
    start_offset: -90m
  latest_at:
    absolute_time:
      start: '18:00'
# Or run at 05:30 only before the same date's sunrise plus 90 minutes:
# timing:
#   absolute_time:
#     start: '05:30'
#   only_before:
#     relative_to:
#       sun: sunrise
#       start_offset: 90m
```

`latest_at` caps the sampled instant at the boundary. `only_before` keeps it only when the resulting instant is **strictly before** its boundary; equality skips. When both are configured, apply the cap first, then the condition. A randomized base samples once: values beyond the cap land on the cap, and excluded values skip without resampling. These modifiers apply to scheduled steps only; random window starts and ends reject them.

Each boundary accepts exactly one quoted `absolute_time.start` clock or `relative_to.sun` event with an optional signed `start_offset`. All six solar events are supported. Ranges, `end`, `end_offset`, durations, step/entity/random references, nested modifiers, explicit nulls, and unknown fields are rejected. Clock and offset validation follows the existing timing rules.

A `latest_at` cap before the earliest base time produces a warning: a clock after midnight still belongs to the source date, so it can move an evening step to that morning. The cap remains valid and keeps its source-date behavior. Clock cases warn during validation; solar and helper cases warn after resolving the dated plan.

Previews of the saved program use a read-only copy of the controller's reached time-source latches. Unsaved drafts use the current HA time sources.

Boundaries belong to the schedule's **source local date** and HA location, even when an offset crosses midnight. Earlier clock boundaries do not roll to the next day. Comparisons use UTC instants; repeated clocks use the first occurrence and nonexistent clocks advance to the first valid instant. Calendar previews place actions on their actual local date while retaining the source date and weekday selection. Solar events are calculated for that source date, rather than read from `sun.sun`'s next-event attributes. An unavailable base solar event or solar boundary skips the step; a clock cap is never a fallback. Missing timezone or location follows normal planning validation.

Preview explains adjusted instants and strict-condition skips, including field paths and the candidate/boundary/adjusted instants. A skipped step creates no actions, stagger ticks, dependent anchor, lighting intent, startup target, or live-preview event. Dependents follow the capped time or skip with an unavailable anchor. Conditions are evaluated while planning; late execution does not compare against the current wall clock. Permission, pause, run-condition, missed-event, and manual-control policies still apply.

Timing modifier edits change behavior hashes; title edits do not. Configurations without modifiers retain their normalized hashes and seeded samples. Scheduled occurrence journals retain source-date step identity across timing edits, replanning, reloads, and restarts; obsolete plan caches are regenerated without replaying completed calls.

See [solar-limits.yaml](../examples/solar-limits.yaml) for a complete example of both lighting rules.

## Run condition

Omit `run_condition` to retain ordinary activation and light handover. When supplied, `entity_id` and `state` are required; the remaining fields are optional:

```yaml
run_condition:
  entity_id: alarm_control_panel.alarm
  state:
    - armed_away
    - armed_night
  enforce_state_on_start: true
  start_delay: 30s
  off_entities:
    - light.bathroom
    - switch.utility_room
```

`entity_id` accepts any entity domain. `state` is one nonempty string or a nonempty list, matching any of the exact HA state values; duplicate states are removed. Quote values such as `"on"` and `"off"` in YAML. Missing, `unknown`, and `unavailable` entities block execution; those last two values cannot be allowed states.

`enforce_state_on_start` is a strict boolean, default `false`, controlled by **Enforce expected state on start** in Settings → Run condition and saved in the program. With the setting off, a matching condition starts future scheduled execution without historical reconciliation. With the setting on, all new scheduled device writes wait for `start_delay`, then Occupied applies supported known targets at that time. The delay remains in Settings and canonical YAML, defaults to `30s`, allows `0s` through `1h`, and uses explicit duration units; bare numbers are rejected. A customized delay is retained but unused when enforcement is off.

Select **Extra entities to turn off** below the enforcement delay to add lights and switches outside your steps and events, such as windowless bathroom lights. These are turned off during startup enforcement after the delay, and by the **Enforce expected state** button. The list is saved as `run_condition.off_entities` (default empty list) and accepts only `light.*` and `switch.*` IDs; duplicate IDs are removed. Entities declared in any step or event, including disabled ones, keep their scheduled behavior. Unavailable and already-off entities are skipped. Manual changes yield an extra entity until the next activation or explicit enforcement; the list does not continuously force devices off.

Permission and pause still apply. Allowed-state transitions do not restart an activation. Condition loss cancels further work without any device commands, including transition holds or cover stops. Editing the policy preserves sampled schedules and completed event identities.

## Random events

The `random` map defines repeated activity inside a window. The GUI edits it in its own **Random** tab.

| Field | Required | Accepted value / default |
| --- | --- | --- |
| `start` | Yes | Absolute or relative window opening time. |
| `end` | Yes | Absolute closing time, elapsed `duration`, or a compatible relative closing time. |
| `"on"` | Yes | Start-phase action or `actions` block. Quote this key in YAML. |
| `"off"` | Yes | End-phase action or `actions` block. Quote this key in YAML. |
| `min_duration` | No | Positive occurrence duration, default `5m`. |
| `max_duration` | No | Positive occurrence duration, default `15m`; must be at least `min_duration`. |
| `count` | No | Integer 0–1000 or a mapping with required integer `min` and `max` bounds; default `3`. |
| `name`, `enabled`, `days` | No | Same values and defaults as steps. |

For example:

```yaml
random:
  living_room:
    start:
      absolute_time:
        start: '18:00'
    end:
      absolute_time:
        start: '23:00'
    min_duration: 5m
    max_duration: 15m
    count:
      min: 2
      max: 6
    'on':
      action: turn_on
      entities:
        - light.living_room
    'off':
      action: turn_off
      entities:
        - light.living_room
```

`start` accepts absolute times, steps (using `relative_to.step`), solar events, HA time sources, or another random window (using `relative_to.random`). A random reference follows that window's sampled **closing time**, with optional signed start/end offsets; it does not follow the last occurrence's end. Dependencies resolve in order for the same source date. Disabled, unscheduled, unavailable, infeasible, or zero-count parents skip their dependents, including further dependent windows in the chain. Random references are only allowed on a random window start. Missing references and cycles are rejected; renaming a random ID rewrites these typed references.

Window starts and ends each choose exactly one timing branch; `latest_at` and `only_before` are rejected on both. `duration` is accepted only for a window end. The window-end editor offers absolute time or duration. For a clock end, set `end.absolute_time.start`, with optional randomized clock bounds in `end.absolute_time.end`. For an elapsed window length sampled from the actual sampled start, set `end.duration.min` and optionally `end.duration.max`:

```yaml
end:
  absolute_time:
    start: '23:00'
```

```yaml
end:
  duration:
    min: 30m
    max: 1h
```

Durations are positive h/m/s values within seven days, with maximum at least minimum; an omitted or equal maximum gives a fixed length. This window length is separate from each occurrence's `min_duration`/`max_duration`. A recurring end rolls into the next local date only when its whole unsampled range precedes the whole start range. Overlapping absolute start/end ranges are a hard validation error. For sampled step, solar or HA bounds, an overlap skips that random item for the source date with a warning; other items keep running. The editor warns when unsampled dynamic bounds can overlap. A sampled inversion never implies an overnight window. Winter sunset before a whole evening start range follows the same overnight rule as a 22:00–02:00 window. Existing `relative_to` ends remain readable for compatibility, but are no longer offered by the editor.

When a sampled window cannot fit its minimum duration and end stagger, that item
is skipped for the date with a warning. Other items keep running. Independent
clock and duration bounds are checked before sampling: an impossible window is an
error even when its count range could sample zero; an always-zero count is skipped.
Bounds that permit both fitting and too-short samples produce a risk warning.
Source-dependent failures are warning skips because their anchors can change.
If runtime planning fails, an enabled controller with open permission gates retries
at the next local midnight. Disabling or unloading it cancels that retry.

A chained window can be configured as follows:

```yaml
random:
  living_room:
    start:
      absolute_time:
        start: '18:00'
    end:
      duration:
        min: 1h
        max: 2h
    'on':
      action: turn_on
      entities:
        - light.living_room
    'off':
      action: turn_off
      entities:
        - light.living_room
  hallway:
    start:
      relative_to:
        random: living_room
        start_offset: 10m
    end:
      duration:
        min: 30m
        max: 1h
    'on':
      action: turn_on
      entities:
        - light.hallway
    'off':
      action: turn_off
      entities:
        - light.hallway
```

The hallway window opens ten minutes after the living-room window closes, regardless of when its individual occurrences finish.

`min_duration` and `max_duration` are positive h/m/s durations within seven days, defaulting to `5m` and `15m`. Maximum must be at least minimum. `count` accepts a fixed integer or a mapping with `min` and `max`, as shown above. Fixed counts and both range bounds are whole numbers from 0 to 1000, with maximum at least minimum. The count is sampled uniformly from the inclusive range independently for each window. An omitted count defaults to 3; existing integer counts remain fixed. Equal range bounds normalize to a fixed integer. Planning budgets use the maximum count. Optional `name`, `enabled`, and `days` follow the step defaults. `on` and `off` each require either a singular action and entities, with optional service data, or an `actions` list, using the same action validation as steps. Either phase can activate a scene or call a native entity service.

Set the count bounds as follows for an equal chance of zero or one occurrence per selected window, or use a larger maximum for zero or more occurrences:

```yaml
count:
  min: 0
  max: 1
```

Every integer in the inclusive range is equally likely. `count: 0` (including a range whose `min` and `max` are both zero) always generates no actions. The count uses its own seeded sampling stream, so revisiting the same source date with the same seed produces the same choice; titles, definition order, and unrelated definitions do not change it or move occurrence times. Independent bounds are validated before sampling the count. After those checks pass, a sampled zero records an informational skip before resolving dynamic timing sources; unavailable sources do not make that skipped date infeasible. No closing-time anchor is exposed, and dependent random windows skip that source date. An always-zero definition is skipped without checking its window.

Each occurrence independently samples its duration and start time. **Duration bounds take precedence over `count`:** the planner never shortens an occurrence below `min_duration` or extends it above `max_duration` to satisfy a fixed count or count range. Both actions stay inside the resolved window, so the effective maximum is `min(max_duration, window_length)`. If a positive count is sampled and `min_duration` exceeds the sampled window length, no occurrences are generated for that definition on that date and a warning explains the skip. Other definitions keep running. A window whose independent bounds cannot fit any occurrence remains an error, regardless of whether a count range might sample zero. Equal durations are supported. Overlap is allowed and does not reduce the sampled count when individual occurrences fit; an end action may run while another occurrence is active. For example, a 30-minute window with a count of 5 and durations of 20–25 minutes produces overlapping events within those duration bounds, while a 4-minute window with a 5-minute minimum produces a duration error instead of shortened events. Sampling streams are stable per ID and occurrence; titles, presentation order, and unrelated definitions do not move sampled times. Step ID renames update both boundary references. Random IDs can be renamed using the CLI/API `random` kind.

## Dates, context, and DST

Timezone and location come from HA, or CLI context flags (`--timezone`, `--latitude`, `--longitude`, `--elevation`). They are not duplicated in program YAML. Offline dated previews require timezone context; solar steps also require location.

A schedule date begins at local midnight. Weekdays select the source date: a Monday 23:50 step plus 30m runs Tuesday 00:20 as Monday's occurrence. Overnight absolute windows follow the same rule. Internal times are aware UTC. Repeated DST clocks use their first occurrence; nonexistent clocks advance to the first valid instant, with a warning. Calendar days can have 23 or 25 hours.

When the daily boundary timer runs late, newly admitted events have a five-minute grace period. Older events are marked as historically skipped, so resuming a suspended host does not replay an entire morning. Moving a time source into the past never backfills the moved event. Unchanged queued work and retries retain their scheduling continuity.

Live compilation has bounded date and event budgets. Excessively long dependency chains or oversized plans fail explicitly instead of silently dropping work.

## Actions

Action definitions are shared by scheduled steps and random event phases. Every phase declares its own targets and behavior: `"off"` does not automatically reverse `"on"`, and either phase can contain any supported action. The GUI's reuse-targets shortcut is available for compatible simple controls.


### Action fields

| Field | Required | Meaning |
| --- | --- | --- |
| `action` | Yes | `turn_on`, `turn_off`, `set_state`, or a qualified Home Assistant service such as `light.turn_on`. |
| `entities` | Yes | A nonempty list of entity IDs for service actions; a nonempty entity-to-settings mapping for `set_state`. |
| `data` | No | Service parameters as a YAML mapping. Defaults to an empty mapping. The permitted fields depend on the action. |
| `stagger` | No | Settings for spreading eligible light/switch changes over time. See [Staggered action](#staggered-action). |

Unknown action fields are rejected. Entity IDs use Home Assistant's `domain.object_id` form. Lists are deduplicated and sorted; state mappings are sorted by entity ID. Entity order therefore does not control execution order. Use separate actions in a list when order matters.

Targets belong in `entities`. The keys `entity_id`, `device_id`, and `area_id` are rejected inside `data`. There are no area, device, or label target selectors in the action format.

### Turn lights and switches on or off

The shorthand actions `turn_on` and `turn_off` accept any combination of light and switch entities:

```yaml
action: turn_off
entities:
  - light.sofa_lamp
  - light.reading_lamp
  - switch.window_lights
```

These actions take no service data. Occupied resolves the matching light and switch services internally. To set brightness, color, or a fade, use `set_state` or an explicit `light.turn_on`/`light.turn_off` action.

### Individual states with `set_state`

Use `set_state` to give each entity its own settings in one action:

```yaml
action: set_state
entities:
  light.sofa_lamp:
    state: "on"
    brightness: 128
    rgb_color:
      - 255
      - 80
      - 0
    transition: 3
  light.reading_lamp:
    state: "on"
    brightness: 200
    color_temp_kelvin: 2700
  light.hallway:
    state: "off"
    transition: 2
  switch.window_lights:
    state: "on"
  cover.living_room:
    position: 40
  cover.bedroom:
    state: "closed"
```

`set_state` is an Occupied action with a scene-style entity mapping. It dispatches ordinary Home Assistant services; it does not create a scene or directly overwrite Home Assistant's state registry. Only lights, switches, and covers are supported. Put settings under each entity; a nonempty top-level `data` mapping is rejected.

#### Light settings

| Field | Accepted value | Available with |
| --- | --- | --- |
| `state` | Required quoted string `"on"` or `"off"`. | On and off |
| `brightness` | Integer from 1 to 255; 255 is full brightness. | On |
| `rgb_color` | List of three integers from 0 to 255, in red, green, blue order. | On |
| `hs_color` | List of two numbers, in hue, saturation order, with hue 0–360 and saturation 0–100. | On |
| `color_temp_kelvin` | Number from 1 to 100000, in kelvin. Device limits may be narrower. | On |
| `transition` | Number from 0 to 604800, in seconds. Device support may be narrower. | On and off |

Use only one of `rgb_color`, `hs_color`, or `color_temp_kelvin` for a light. `brightness_pct` is not accepted in `set_state`; use `brightness` here or an explicit light service for percentages. Brightness zero is rejected: use `state: "off"`.

An on entry without brightness does not request a new brightness. During light state enforcement, Occupied keeps a known desired brightness when available; otherwise brightness is left to Home Assistant or the device.

Actual device capabilities still apply. Occupied removes unsupported dimming, color, and transition parameters during light service preparation. A valid configuration cannot add capabilities to a device.

#### Switch settings

Switch entries accept only `state: "on"` or `state: "off"`. Brightness, color, and transition fields are rejected.

#### Cover settings

Each cover entry accepts exactly one of:

| Field | Accepted value |
| --- | --- |
| `state` | `"open"` or `"closed"`. |
| `position` | Integer from 0 (fully closed) to 100 (fully open). |

Do not combine `state` and `position`. Tilt, stop, and other cover operations use explicit service actions below.

### Explicit light and switch services

Use a qualified action when several entities share the same parameters:

```yaml
action: light.turn_on
entities:
  - light.sofa_lamp
  - light.reading_lamp
data:
  brightness_pct: 65
  hs_color:
    - 30
    - 80
  transition: 5
```

| Action | Targets | Accepted `data` |
| --- | --- | --- |
| `light.turn_on` | Lights only | `brightness`, `brightness_pct`, `rgb_color`, `hs_color`, `color_temp_kelvin`, `transition`. |
| `light.turn_off` | Lights only | `transition` only. |
| `switch.turn_on` | Switches only | None. |
| `switch.turn_off` | Switches only | None. |

For explicit light services, `brightness` accepts numbers from 1 to 255 and `brightness_pct` accepts numbers from 0.01 to 100. Choose one brightness field. RGB components accept numbers from 0 to 255. Other numeric ranges and the one-color-setting rule match the light settings table above. The stricter integer requirements for `set_state` brightness and RGB do not apply to these service data fields.

These four services use Occupied's typed control validation; arbitrary extra Home Assistant light or switch parameters are rejected. For example, `effect` and `flash` are not supported by `light.turn_on` in this format. A Home Assistant scene or script can encapsulate behavior that needs other parameters.

A fade to off can be written as:

```yaml
action: light.turn_off
entities:
  - light.sofa_lamp
data:
  transition: 10
```

`transition` is a device fade duration in seconds. It does not delay the start of the next action in a list.

### Home Assistant scenes

`scene.turn_on` requires exactly one scene entity. Optional `data` is passed to the service, subject to Home Assistant validation:

```yaml
action: scene.turn_on
entities:
  - scene.evening
data:
  transition: 3
```

Use separate actions to activate multiple scenes. Occupied treats scene effects as opaque: it cannot infer affected entities, calculate an inverse, or automatically restore a previous scene.

### Cover services

Use native cover services for movement, position, tilt, and stopping:

| Action | Standard parameters |
| --- | --- |
| `cover.open_cover` | No data needed. |
| `cover.close_cover` | No data needed. |
| `cover.stop_cover` | No data needed. |
| `cover.set_cover_position` | `data.position`, for example `60`. |
| `cover.open_cover_tilt` | No data needed. |
| `cover.close_cover_tilt` | No data needed. |
| `cover.stop_cover_tilt` | No data needed. |
| `cover.set_cover_tilt_position` | `data.tilt_position`, for example `25`. |

Positions run from 0 (closed) to 100 (open). The GUI's cover controls use whole percentages; native service payloads are checked against the installed Home Assistant service schema.

```yaml
- action: cover.set_cover_position
  entities:
    - cover.living_room
  data:
    position: 60
- action: cover.set_cover_tilt_position
  entities:
    - cover.living_room
  data:
    tilt_position: 25
```

Standard cover commands contribute position and tilt targets to preview. A stop clears the affected target because the final position is unknown. Waiting for a service call to return does not necessarily wait for the cover to finish moving.

### Other entity services

Other qualified `domain.service` actions can call installed Home Assistant services with explicit entity targets and JSON-compatible data:

```yaml
action: media_player.volume_set
entities:
  - media_player.living_room
data:
  volume_level: 0.25
```

```yaml
action: script.turn_on
entities:
  - script.evening_routine
data:
  variables:
    room: living_room
    brightness: 80
```

Data may contain strings, numbers, booleans, nulls, lists, and nested mappings as permitted by the service. Non-finite numbers and non-JSON values are rejected. Installed service schemas are checked during GUI validation/save without executing the action; the YAML parser alone cannot verify that a service exists or accepts a payload. `homeassistant.turn_on`, `homeassistant.turn_off`, and `homeassistant.toggle` also check the native schema for each target domain. Invalid data blocks GUI save, including repairs to an existing program. Targets whose domains lack that service produce a warning because HA skips them.

Services must fit this entity-targeted format. `event.fire` is explicitly rejected. Home Assistant automation syntax such as `target:`, `service:`, or `service_data:` is not accepted; use Occupied's `action`, `entities`, and `data` fields.

The GUI offers remote activity controls for `remote.turn_on` and `remote.turn_off`, using this same service format. Suggestions are shared by every selected remote, and custom activity values are accepted. An empty activity uses the integration's default or last activity.

Generic services are opaque to Occupied. It does not infer their device effects, inverse actions, cleanup, or expected state for enforcement.

### Combine actions

A list combines different action types at one scheduled occurrence:

```yaml
- action: set_state
  entities:
    light.sofa_lamp:
      state: "on"
      brightness: 20
    cover.living_room:
      position: 40
- action: scene.turn_on
  entities:
    - scene.evening
- action: cover.stop_cover
  entities:
    - cover.bedroom
```

Actions share one sampled start time and run in list order. Ordinary service calls are awaited, but device movement and native fades can continue after a service returns. An enabled stagger period defers the following action until that period ends.

A failed call stops the remaining calls in the block. Completed calls are not rolled back, and the block is not retried as a whole. Permission changes stop remaining dispatch. Disabled or unavailable typed targets follow the runtime's skip policies. Results are recorded per call.

Occupied waits up to 10 seconds for a native service handler. If the wait expires, the outcome is `uncertain` and that call is never retried. The handler keeps running; when it finishes, the matching journal or live-preview outcome becomes `dispatched` or `failed`. Late success writes the logbook entry with the original call context. Closed controllers, replaced programs, and replaced preview sessions ignore stale completion results. Calls are never replayed, including after restart. Ordered blocks stop after an uncertain call and stay stopped when it later succeeds.

Each scheduled call reclaims its explicit targets from earlier manual overrides. New manual overrides during dispatch can still cancel affected calls. Opaque scene/script effects do not establish ownership of entities absent from the declared targets.

Blocks allow 1–100 actions and at most 1000 declared entity targets across their members, after per-action deduplication. A `set_state` mapping also has a 1000-entity limit. Planner event budgets can impose additional limits on the resulting schedule. Nested action lists are rejected.

### Staggered action

Staggering changes one light or switch at each evenly spaced tick, in a shuffled order:

```yaml
action: set_state
stagger:
  enabled: true
  period: 90s
entities:
  light.sofa_lamp:
    state: "on"
    brightness: 128
  light.reading_lamp:
    state: "on"
    brightness: 200
  switch.window_lights:
    state: "off"
```

| Field | Default | Accepted value |
| --- | --- | --- |
| `stagger.enabled` | `false` | Boolean `true` or `false`. |
| `stagger.period` | `2m` | Explicit duration from `1s` through `30m`, such as `90s`, `2m`, or `1m30s`. |

Bare numbers and colon durations such as `00:02:00` are rejected. A custom period can be retained while staggering is disabled.

Staggering supports `turn_on`, `turn_off`, `light.turn_on`, `light.turn_off`, `switch.turn_on`, `switch.turn_off`, and `set_state` containing only light/switch on/off entries. A state mapping can mix on and off entries. Enabled staggering is rejected for scenes, covers, and other services.

For `N` entities and a period `W`, ticks are `W / N` apart. The first tick occurs after one interval and the last at the period's end. Four targets over `2m` change at +30, +60, +90, and +120 seconds. A single target changes at the endpoint. Each new transition gets a new permutation; an already sampled plan retains its order through preview and restart.

During a staggered action, Status shows **Staggering** and Status reason shows progress such as `Staggering: 3/7 events`. The counter includes processed ticks, including skipped ticks, and returns to the normal status when staggering finishes or stops.

A light's `transition` remains its fade duration after its tick. Stagger options are never passed as Home Assistant service data.

#### Staggering in a list

Put `stagger` on individual actions, not on an `actions` wrapper:

```yaml
- action: turn_on
  entities:
    - light.sofa_lamp
    - switch.window_lights
  stagger:
    enabled: true
    period: 2m
- action: light.turn_on
  entities:
    - light.reading_lamp
  data:
    brightness_pct: 30
```

Here the reading-lamp call follows the last stagger tick, two minutes after the block's scheduled start. Enabled stagger periods in a block may total at most 30 minutes.

A block failure stops future ticks and later actions. An unavailable or disabled target consumes its tick without moving the remaining times. Unrelated scheduled events can run between ticks. A newer direct intent for an entity cancels that entity's pending older ticks.

Timing and related-step anchors still refer to the original scheduled start. To schedule a related step after a stagger completes, include the period in its offset. Ticks crossing midnight appear on their actual calendar date.

For random events, enabled periods in the start block must total strictly less than `min_duration`. End-block periods reserve room inside the enclosing window. Infeasible windows produce validation or planning errors instead of silently shortening the periods.

Preview shows each tick's time and target. Manual live preview's **Next event** advances one tick immediately; ordinary calls at the same boundary follow in list order. Normal scheduling uses the planned tick times. Activation handover has its own timing rules and can subsume typed light calls while converging to the expected state.

#### Editing stagger settings

For an eligible light/switch action, open **Advanced settings** and enable **Staggered action**. **Time window** defaults to `2m`. Random events have separate controls for start and end actions. A single validated Custom YAML action can use these controls; multi-action blocks retain their per-action YAML settings. Applying the dialog updates the form; saving the step or event persists it. Cancel leaves the form unchanged.

### Custom YAML action editor

Choose **Custom YAML** in a step or a random event's action editor. Enter either one action mapping:

```yaml
action: turn_on
entities:
  - light.living_room
  - switch.window_lights
```

Or an ordered list of action mappings:

```yaml
- action: light.turn_on
  entities:
    - light.living_room
  data:
    brightness_pct: 50
    transition: 3
- action: scene.turn_on
  entities:
    - scene.evening
```

The editor accepts the action itself. Do not add an `actions:` wrapper, `steps:`, timing fields, or a complete program here. Timing, weekdays, and whether a step is enabled are configured outside the action editor. See [Full program example](#full-program-example) for the file representation and [Timing](#timing) for scheduling options. The editor generates equivalent YAML from the current simple controls when possible.

### Full program example

In a complete configuration file, custom blocks belong under `actions`, including single-action blocks. Simple steps can instead use singular `action`/`entities`/`data`/`stagger` fields. Choose one representation per step or event phase; do not combine them.

```yaml
schema_version: 1
name: House
steps:
  sunset_lights:
    timing:
      relative_to:
        sun: sunset
    actions:
      - action: set_state
        entities:
          light.sofa_lamp:
            state: "on"
            brightness: 20
          cover.living_room:
            position: 40
      - action: scene.turn_on
        entities:
          - scene.evening
random:
  evening_activity:
    start:
      absolute_time:
        start: '18:00'
    end:
      absolute_time:
        start: '23:00'
    min_duration: 5m
    max_duration: 15m
    count:
      min: 2
      max: 4
    "on":
      actions:
        - action: light.turn_on
          entities:
            - light.reading_lamp
          data:
            brightness_pct: 60
        - action: switch.turn_on
          entities:
            - switch.window_lights
    "off":
      actions:
        - action: turn_off
          entities:
            - light.reading_lamp
            - switch.window_lights
```

See [examples/custom.yaml](../examples/custom.yaml) for another complete configuration. Additional examples cover [house schedules](../examples/house.yaml), [random windows](../examples/random.yaml), [staggering](../examples/stagger.yaml), [run conditions](../examples/alarm.yaml), and [solar timing limits](../examples/solar-limits.yaml).

## Validation, editing, and export

Quote state strings such as `"on"` and `"off"`, and full-program phase keys `"on"` and `"off"`. The YAML loader otherwise interprets these unquoted words as booleans. Quote clock strings as well.

The editor uses the same strict YAML loader as managed files. It rejects duplicate keys, non-string mapping keys, unsafe tags, recursive aliases, merge keys (`<<`), unknown fields, and inputs larger than 1 MiB (UTF-8 bytes). Expanded YAML is limited to 100000 visited nodes, including alias expansion. Errors include field paths such as `steps.evening.timing.absolute_time.start` and YAML source line numbers. Unknown and retired fields are rejected even on disabled definitions. Ordinary nonrecursive aliases can be parsed, but export does not preserve the original anchor structure.

If a stored program is invalid, Occupied preserves its original YAML and disables GUI editing. Open Settings to repair and save the YAML, or choose **Discard preserved program** and confirm to start with an empty program. Ordinary GUI/API saves cannot replace the preserved source without an explicit discard.

Invalid custom text stays available for correction and cannot replace the last valid configuration. Editing a title or timing preserves the complete action block. Switching to simple controls converts a representable single action without losing settings; replacing individual settings or a multi-action block requires an explicit decision. Custom text remains available while the editor is open.

The submit/save flow validates the complete candidate and installed service schemas. In managed-file mode, edits create a draft for export; Occupied does not write the managed source. Deploy the exported configuration and reload it. Moving to GUI storage copies supported action settings.

Export preserves behavior, action order, Unicode, presentation order, and opaque service payloads, but normalizes entity ordering and defaults. It omits all-week selections, `enabled: true`, zero offsets, equal ends, empty data, and internal defaults. Original comments, anchors, and formatting are not preserved. Repeated export/import stabilizes after one normalization.

The behavior hash identifies sampled schedule behavior and excludes run-condition policy, titles, and presentation order. Run-condition policy changes update the source revision and activation lifecycle without changing sampled event identities. Explicit equivalent defaults have the same hash. Source revision separately includes metadata and presentation order. Metadata-only saves retain sampled times and active handover deadlines. Random streams are keyed by source date and stable ID, so unrelated definitions do not shift existing choices.

`occupied rename-id FILE step OLD NEW` and the `occupied/rename_id` API atomically rename a key and its typed step references. Use the `random` kind for random IDs and their typed references. Opaque data is not rewritten. Renaming an ID selects a new random stream; changing a title does not.

Validate and normalize a program with the standalone CLI:

```sh
occupied validate examples/house.yaml
occupied validate examples/house.yaml --date 2026-10-20 --days 7 --timezone Europe/Stockholm --latitude 59.3 --longitude 18.1
occupied export examples/house.yaml
```

Offline validation checks format and references; dated validation also checks sampled feasibility. Installed service schemas and current HA time-source values require Home Assistant context.

### Unsupported constructs

Action YAML does not embed Home Assistant's automation or script language. It does not support templates, conditions, delays, waits, loops, choose/if branches, parallel blocks, nested action lists, variables at the action level, or per-action scheduling fields. Use related scheduled steps for separate times, random events for paired activity, or a Home Assistant script invoked through an entity service for more complex behavior.

There are no routine containers, inherited defaults, probability fields, weighted targets, or configurable sampling distributions. Staggering uses the explicit `stagger` mapping described above. Permission, pause, timezone, location, seeds, and handover settings are not program or step YAML fields.

## Projection and runtime

Controlled entities are derived from enabled steps, both phases of enabled random events, and eligible `run_condition.off_entities`. Only direct typed light intents participate in handover. Default handover state starts Unknown for each local date until a scheduled action establishes intent; activation leaves unknown state alone. An explicit midnight step can establish an initial state. Explicit state enforcement, both on startup and through the enforcement button, also considers known targets from the preceding local calendar day, preserving overnight intent without replaying historical actions. Scenes/services remain opaque and do not supply inferred baselines.

On without brightness keeps known desired brightness or delegates brightness to HA/the device. It never inserts a default percentage. Handover uses one internal ten-minute default and HA capabilities for native transitions or bounded fallback calls. Light target matching and native fades allow ±1 device unit for brightness and each RGB component, ±1° hue (including the 0°/360° wrap), ±1 percentage point saturation, and ±1% of the requested kelvin for color temperature. Unknown color reports do not match. Percentage brightness targets are rounded to device integers. Reporting jitter does not accumulate into a permitted reversal. Outside manual changes yield that entity until its next scheduled action or the next activation. Stopping leaves states and holds still-owned native fades at the observed level.

Permission and pause are HA controls. HA automations can drive permission using their own conditions. These runtime controls are not YAML step fields. The optional program-level `run_condition` controls eligibility and startup state enforcement. Historical generic actions are never replayed; service calls are journaled durably before dispatch.

Standard cover commands provide independent position/tilt targets for preview. A stop clears its affected target because the actual stopped position is unknown. Cover activation is **future only** by default; the **Enforce expected state on start** setting also reconciles known cover axes when a run condition is configured. With the setting off, past calls are skipped, even when preview has a known target. Covers never participate in light handover; historical movement requires explicit startup enforcement. Outside changes to `current_position` or `current_tilt_position` yield the entity until its next scheduled action or the next activation. Controller stop leaves cover movement to the device and does not implicitly send a stop or restore call.

During a dispatched native light transition or cover move, device reports that progress toward the requested brightness, color or position retain controller ownership after HA drops the call context. Reversals, unrelated changes and reports with a user or automation context still yield to manual control. Light tracking ends with its transition; cover tracking ends at the target or after five minutes. Tracking is saved for restart recovery.

Reports with Occupied's own context update the tracked progress too. An off report during a fade-on yields the light, including after a restart, so handover completion respects the manual off.

Runtime plan caches store the seed, per-date planning context, source revision and a fingerprint. Plans are regenerated in the executor on restart. If a fingerprint changes (for example after a timezone or solar-library update), the regenerated plan keeps that date's saved context and the controller logs the drift at INFO; other saved dates are retained. Cached provenance is recomputed only when plans change. Older full-plan caches migrate on save, and incompatible or corrupt caches are rebuilt without replaying completed journal entries. The write-ahead pending/dispatched journal is still saved immediately around every service call.

## Managed files

A managed file contains a complete program as described above. Configure a single file in Home Assistant's `configuration.yaml`, then restart Home Assistant. Occupied creates the controller automatically; no UI setup is needed:

```yaml
occupied:
  config_file: occupied/house.yaml
```

For multiple managed controllers, use `instances` instead of the singular `config_file`:

```yaml
occupied:
  instances:
    - id: house
      config_file: occupied/house.yaml
    - id: garden
      config_file: occupied/garden.yaml
```

Each instance requires a unique `id` matching `[a-z][a-z0-9_]*` and a `config_file`. These bootstrap IDs differ from step/random IDs: hyphens are not allowed. The bootstrap wrapper does not belong in the program file or either YAML editor.

Paths must be relative to the Home Assistant config directory, use `.yaml` or `.yml`, and resolve inside that directory. Absolute paths, `..`, hidden path components, and `secrets.yaml`/`secrets.yml` are rejected, including through symlinks. Occupied reads managed sources without overwriting them. Deploy an exported draft to the source file and reload it to apply file changes.
