# Occupied program schema, version 1

The editor, CLI, backend draft APIs and daily runtime accept this canonical model. Configure it using [the editor guide](editor.md) or apply through [the runtime API](runtime.md). Authoritative managed-file reloads remain Milestone 5. Preview never invokes services. In Home Assistant it reads a snapshot of known time sources; it does not evaluate activation conditions.

Start with [the household example](../examples/house.yaml). `occupied-config export FILE` emits normalized YAML with shared defaults. JSON drafts and YAML normalize through the same models and validators. Unknown fields, duplicate YAML keys, unsafe tags, recursive aliases, and YAML merge keys are rejected. Use schema defaults for sharing settings. Issues include a model path and, for YAML input, source line/column.

## Program, identities, and targets

`schema_version: 1` and `name` are required. The version must be an integer. Optional top-level fields are `description`, `timezone`, `location`, `day_boundary`, `activation`, `policies`, `defaults`, `lighting`, `constraints`, `groups`, and `routines`.

Each group, routine, step, activity, and window has an `id` and `name`, with optional `description`. IDs match `[a-z][a-z0-9_-]*`; they are unique across all resources of the same kind. Step references identify steps across routines. Names/descriptions are metadata; IDs participate in references, event identity, and random streams. The model does not execute templates or expressions.

Groups contain a nonempty `entities` list and an optional partial `handover` override. Entity IDs use HA's `domain.object_id` form. Every target wrapper contains optional `groups` and `entities` lists:

```yaml
targets:
  groups: [bedrooms]
  entities: [light.hall]
```

Groups expand to entities; duplicates are removed and members are sorted. Unknown groups are errors. Renaming an ID through `rename-id`/`occupied/rename_id` rewrites typed target and anchor references, validates the complete replacement, then returns it atomically. Failed migration returns no replacement. Arbitrary service-data strings are not rewritten. The loader and preview never write the source file; choose a separate CLI output path to review a replacement.

## Time and duration

`timezone` defaults to `home_assistant`: the HA preview API supplies configured timezone/location; offline preview needs `--timezone Europe/Stockholm` or an explicit program IANA timezone. Optional `location` contains latitude, longitude, and elevation in metres. CLI location arguments provide context when the program omits location.

`day_boundary` defaults to `"02:00"`. A simulation date covers that local boundary to the next. Local clocks before the boundary belong to the following civil date. Weekdays refer to the simulation date, including events after midnight. Internal instants are aware UTC; event exports include local equivalents. Simulation days can be 23 or 25 hours.

Repeated DST times choose the first occurrence. A nonexistent time advances to the first valid instant, with an issue recording the adjustment. Clock/window ordering and duration bounds are checked after conversion. Sun events are calculated for the requested date/location. If an event is unavailable, the item is skipped with an explanation or uses its explicitly supplied fallback. No sunset is invented.

Clock values are quoted `HH:MM` or `HH:MM:SS`. Durations require explicit ordered h/m/s units, for example `10s`, `20m`, `2h30m`, or `1.5s`. Signed offsets permit `-30m`. Bare numbers and colon durations are rejected. Durations are finite and at most seven days. Activity and on-durations must be positive; gaps/staggers/handovers can be zero.

Duration ranges are `{fixed: 45m}` or `{min: 5m, max: 20m}`. Optional `mode` selects the peak for triangular sampling. Counts similarly use `fixed` or `min`/`max`, with integers from 0 to 1000. A mode must lie within its range.

Steps and timed activities have one `when` form:

```yaml
when:
  clock_range: {earliest: "06:40", latest: "07:20", mode: "07:00"}
# or
when:
  sun_range:
    sun: sunset
    offset_range: {min: -30m, max: 30m}
    fallback: "18:00"
# or
when:
  relative_to: wake
  offset_range: {min: 5m, max: 20m}
# or: a time helper or timestamp sensor
when:
  entity_range:
    entity_id: sensor.phone_next_alarm
    offset_range: {min: -30m, max: -10m}
# or: the start/end of the calendar event currently reported by HA
when:
  entity_range:
    entity_id: calendar.work
    attribute: start_time # or end_time
    offset_range: {fixed: -15m}
```

`sun_range.sun` and sun window anchors support `sunrise`, `sunset`, `dawn`, `dusk`, `noon` and `midnight`. Dawn/dusk use civil twilight (sun 6° below the horizon). Solar events are calculated for each requested date, independent of HA's next-event sensors.

`entity_range` accepts a time-bearing `input_datetime`, a sensor with `device_class: timestamp`, or a calendar with `attribute: start_time`/`end_time`. Time-only helpers repeat every simulation day. Dated helpers, timestamp sensors and calendar bounds refer only to the occurrence HA currently reports; they are not extrapolated onto other dates. Missing, unavailable or invalid values skip the item with a warning, and other dates report no known occurrence. Offsets can cross the boundary when the item permits it. The HA runtime reschedules pending work when a source changes, preserves ongoing handover/cleanup, and does not replay a completed step on the same simulation date. Calendar event lists and reactive triggers are not part of this source model. CLI previews have no HA snapshot, so entity sources are skipped with a warning.

Step start times always use uniform sampling, including clock, sun and relative intervals. Equal bounds give a fixed start time. Legacy `when.distribution`, `time_distribution` and range `mode` fields remain accepted for compatibility but do not change step start sampling. Timed activities still allow `when.distribution` to select `uniform` or `triangular`. Relative instants retain their parent step's dependency date and add elapsed UTC duration. A missing/skipped parent suppresses dependent work with an explanation. Cycles and dangling anchors are errors. If a parent is unavailable on some selected weekdays, narrow the dependent days or explicitly choose `missing_anchor: skip`.

Clock ranges crossing midnight require `cross_midnight: true` inside `clock_range`. Windows use the same flag inside `between`/`within`. Crossing the simulation-day boundary additionally requires `allow_cross_boundary: true` on the item. These are separate choices: 23:00–01:00 crosses midnight but stays within a default 02:00 day.

## Defaults and routines

Defaults resolve program → partial routine defaults → item/action overrides. They remain explicit in normalized export, rather than disappearing into expanded routines.

| Setting | Default | Overrides |
| --- | --- | --- |
| `time_distribution` | `uniform` | Routine defaults; item; `when.distribution` for start time |
| `probability` | 1 | Routine defaults; item |
| `target_order` | `ordered` | Routine defaults; action |
| `stagger` | `{fixed: 0s}` | Routine defaults; action |
| `activity_windows.on_duration` | `{min: 5m, max: 2h30m}` | Routine defaults; window |
| `activity_windows.min_gap` | `0s` | Routine defaults; window |
| `activity_windows.overlap` | `false` | Routine defaults; window |
| `activity_windows.target_mode` | `all` | Routine defaults; window |
| `activities.duration` | No default | Routine defaults; activity; an effective duration is required |
| `activities.stop_behavior` | `end_if_owned` | Routine defaults; activity |
| `handover.duration` | `10m` | `lighting.handover`; group `handover` |

A routine contains `steps`, `activities`, and `activity_windows`, any of which may be empty. Its `days` defaults to all seven `mon`…`sun` values. An item's optional `days` narrows its routine's days; empty or contradictory selections are errors. Routine `probability` independently gates the entire routine. The resolved item probability then gates individual items. Values range from 0 to 1. Item `time_distribution` also controls duration sampling; `when.distribution` only changes its start.

## Discrete actions and timed activities

A step requires a nonempty ordered `actions` list. Each action has an `action` name, optional typed `targets`, arbitrary JSON-compatible `data`, declared `resources`, `target_order`, `stagger`, and `replay_safe`.

`turn_on`/`turn_off` resolve light and switch domains separately. `safety_off` is a highest-priority light off intent. Qualified `light.turn_on`, `light.turn_off`, `switch.turn_on`, and `switch.turn_off` are also typed. Light data accepts brightness or brightness_pct, one of color_temp_kelvin/hs_color/rgb_color, and transition. Typed switch calls accept no brightness/color payload. Zero brightness is rejected: use an explicit off intent. Select one color mode and valid numeric ranges. Generic `entity_id`, `device_id`, or `area_id` in data is rejected; put entity selection in `targets`.

Other qualified actions, such as `remote.turn_on`, `media_player.play_media`, `scene.turn_on`, and `script.turn_on`, preserve opaque service data. Their effects and inverses are not inferred. Declare affected resources; use explicit lifecycle end actions. Preview does not validate device availability or a service's installed schema. Generic calls with no stagger retain the target list; staggered calls split targets. Ordered target execution uses canonical entity order; shuffled execution is seeded. Stagger durations separate target calls within an action, and later actions follow the completed earlier action sequence.

An activity requires `when`, an effective positive `duration`, a nonempty exclusive `resources` list, and nonempty `on_start`/`on_end` action lists. Optional `start_conditions` and `ownership_conditions` use native HA checks before starting and ending. `stop_behavior` is `end_if_owned` or `leave_running`. No reverse command is inferred.

The nominal end deadline is the sampled duration after completion of the planned start sequence, including stagger. Exclusive resources stay reserved through the last staggered end action. Optional `within` bounds the entire lifecycle with a `start` and `end` anchor. Start placement retries are bounded by `generation_attempts`; inability to fit the duration, day, enclosing window, or existing resources is reported as infeasible. The runtime measures the deadline from the final successful start dispatch, confirms ownership for at most three seconds, rechecks the actual enclosing window, and persists the original end actions/deadline for recovery. Late starts that no longer fit receive their configured owned cancellation.

## Bounded activity windows

A window requires `between` and `cycles`. The existing `targets` form repeats light/switch on/off leases. For service-based cycles, provide ordered `on_start` and `on_end` action lists instead; these use the same action format as steps and timed activities, so scenes and scripts work as targets. The two forms are mutually exclusive. Each sampled cycle dispatches its start list at the interval start and its end list at the interval end. Generic actions are opaque and Occupied cannot infer or clean up their effects if a cycle is interrupted.

```yaml
between:
  start: {sun: sunset, offset: -1h, fallback: "18:00"}
  end: {step: bedtime}
cycles: {min: 2, max: 4}
on_duration: {min: 5m, max: 25m}
min_gap: 10m
overlap: false
targets: {groups: [kitchen]}
```

Generic cycles can repeat arbitrary service actions. For example, to activate an on-scene and later activate an off-scene:

```yaml
between:
  start: {clock: "17:00"}
  end: {clock: "23:00"}
cycles: {fixed: 4}
on_duration: {min: 5m, max: 2h30m}
on_start:
  - action: scene.turn_on
    targets: {entities: [scene.office_on]}
on_end:
  - action: scene.turn_on
    targets: {entities: [scene.office_off]}
```

`event.fire` emits a native Home Assistant event without a script workaround. Put its event name in `data.event_type` and an optional payload object in `data.event_data`. This action can appear in any supported action list:

```yaml
actions:
  - action: event.fire
    data:
      event_type: occupied_presence
      event_data: {room: office, state: active}
```

An anchor chooses exactly one `step`, `clock`, or `sun` (`sunrise`/`sunset`), plus optional signed `offset`. Clock/sun anchors support `day_offset: 1`; step anchors preserve the dependency date and use offsets instead. Sun anchors alone accept a quoted clock `fallback`. Windows must have positive elapsed length.

`target_mode` is `all`, `one`, `subset`, or `weighted_subset`. Subset modes require `subset_size` using count-range syntax, at least one and no greater than the expanded target count. Positive `weights` keyed by target entity apply to `one`/`weighted_subset`; omitted weights are 1. Selection is without replacement per interval.

Non-overlapping windows fit the selected count's minimum durations and gaps first, sample durations within the remaining feasible space, and distribute remaining slack across gaps. This conditions broad duration bounds on the available span. `overlap: true` permits independently placed intervals, requires zero minimum gap, and can use a local `max_simultaneous` limit. Cycles do not get silently dropped, and windows are not extended to hide infeasibility. A sampled zero count is explained and emits no intervals.

`constraints.generation_attempts` defaults to 64, from 1 to 256. `max_simultaneous_groups` optionally limits concurrently active random-window groups. Subset windows count only referenced groups containing selected entities; a direct-entity window has its own implicit group. Shared groups count once. Timed generic activities use separate exclusive declared-resource leases. Resource placement uses stable identifier order, bounded retries, and explicit infeasibility issues.

## Lighting projection and handover

`lighting.managed_targets` identifies participating lights. Only targets with an explicit `baseline` are projected. A baseline chooses `"on"`/`"off"` and optional brightness/color data. Lights without a baseline produce a warning and are left alone; unmanaged targets are also excluded. `default_brightness_pct` defaults to 70.

Projection folds the sampled plan to a requested aware instant:

- Random on-intervals hold separate leases; one interval ending releases only its lease. An on baseline returns to on after leases expire.
- Explicit routine on/off intents override random leases. Off suppresses random reactivation until another explicit on; safety-off suppresses later intents for the rest of the day.
- On without brightness preserves a known desired on-level, otherwise uses the configured default. A new color intent replaces the previous color mode.
- Scene/script effects are opaque and are not projected. A caller-provided yielded-entity set removes those entities from projection.

Events sort by UTC instant, priority (window 10, explicit 20, safety 30), then endings before starts at the same priority, stable source identity, and ordered action sequence.

Handover resolves program default → `lighting.handover` → group override. Its target policy is `projected_state_at_completion`; default duration is ten minutes. Preview calculates each target's endpoint at its own deadline, including intervening intents. Shared managed groups use the longest effective duration; a directly managed target also contributes the global duration. Preview reports transient intervals subsumed during convergence and can compare endpoints with caller-supplied observations.

Additional handover settings are `dimming: auto|stepped_only`, `non_dimmable: stagger`, positive `step_interval` (default 30s), and `cancel_behavior: hold_current`. The runtime selects native transitions from HA capabilities or uses at most 256 steps per target. Non-dimmable targets change at stable staggered times in the latter half of the handover. Stop holds observed brightness for still-owned native fades; manual control yields the target without cancelling another actor's transition. A single-day preview reports `next_day_plan_required` when a deadline needs the next sampled day; the runtime loads that date.

## Activation, policies, and reproducibility

Activation and activity conditions use HA-shaped `state`, `and`, `or`, and `not` predicates. A state condition requires `entity_id` (scalar/list), literal `state` (scalar/list), optional attribute, and optional `match: all|any`. Boolean predicates contain nonempty `conditions`. Quote states such as `"on"` and `"off"` in YAML. Preview keeps these predicates in the canonical model; it does not claim that real-time gate checks passed.

Runtime policies are `late_start: future_only`, `lighting_stop_behavior: leave_states|turn_off_owned`, and `manual_override: yield_entity_until_next_activation|authoritative_simulation`. The default yields externally changed entities until the next activation session. Explicit authoritative lighting may continue the schedule, but activity cleanup still requires matching ownership. Optional light cleanup only affects still-owned targets; it does not override activity stop policies. See the runtime guide for dry run and recovery.

Random choices use independent streams keyed by seed, resource kind/ID, field, and interval index. Date previews derive independent date seeds, so a single-date preview matches that date within a week. Metadata changes, resource reordering, and unrelated unconstrained steps preserve existing choices; changed constraints can deliberately change placement. Action-list order and opaque service-data lists retain execution meaning. ID migration preserves references but changing an ID intentionally selects a new random stream.

The behavior hash excludes labels/descriptions and irrelevant member/resource ordering, resolves defaults, and retains effective constraints and action meaning. Source revision separately identifies the normalized source including metadata. A daily plan's behavior hash additionally records resolved timezone/location; planner version is recorded for future recovery. Canonical export/reimport preserves behavior. Previews are limited to 1–31 dates and programs to 5000 scheduling items.
