# Custom YAML actions

For advanced action configurations, choose **Custom YAML**. This allows you, for example, to set brighness and other extra settings for lights.

This document is a reference for what is possible with custom yaml.

## What to enter in the editor

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

The editor accepts the action itself. Do not add an `actions:` wrapper, `steps:`, timing fields, or a complete program here. Timing, weekdays, and whether a step is enabled are configured outside the action editor. See [Full program YAML](#full-program-yaml) for the file representation and [configuration schema](schema.md) for scheduling options.

## Action fields

| Field | Required | Meaning |
| --- | --- | --- |
| `action` | Yes | `turn_on`, `turn_off`, `set_state`, or a qualified Home Assistant service such as `light.turn_on`. |
| `entities` | Yes | A nonempty list of entity IDs for service actions; a nonempty entity-to-settings mapping for `set_state`. |
| `data` | No | Service parameters as a YAML mapping. Defaults to `{}`. The permitted fields depend on the action. |
| `stagger` | No | Settings for spreading eligible light/switch changes over time. See [Staggered action](#staggered-action). |

Unknown action fields are rejected. Entity IDs use Home Assistant's `domain.object_id` form. Lists are deduplicated and sorted; state mappings are sorted by entity ID. Entity order therefore does not control execution order. Use separate actions in a list when order matters.

Targets belong in `entities`. The keys `entity_id`, `device_id`, and `area_id` are rejected inside `data`. There are no area, device, or label target selectors in the action format.

## Turn lights and switches on or off

The shorthand actions `turn_on` and `turn_off` accept any combination of light and switch entities:

```yaml
action: turn_off
entities:
  - light.sofa_lamp
  - light.reading_lamp
  - switch.window_lights
```

These actions take no service data. Occupied resolves the matching light and switch services internally. To set brightness, color, or a fade, use `set_state` or an explicit `light.turn_on`/`light.turn_off` action.

## Individual states with `set_state`

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

### Light settings

| Field | Accepted value | Available with |
| --- | --- | --- |
| `state` | Required quoted string `"on"` or `"off"`. | On and off |
| `brightness` | Integer from 1 to 255; 255 is full brightness. | On |
| `rgb_color` | Three integers from 0 to 255: `[red, green, blue]`. | On |
| `hs_color` | Two numbers: `[hue, saturation]`, with hue 0–360 and saturation 0–100. | On |
| `color_temp_kelvin` | Number from 1 to 100000, in kelvin. Device limits may be narrower. | On |
| `transition` | Number from 0 to 604800, in seconds. Device support may be narrower. | On and off |

Use only one of `rgb_color`, `hs_color`, or `color_temp_kelvin` for a light. `brightness_pct` is not accepted in `set_state`; use `brightness` here or an explicit light service for percentages. Brightness zero is rejected: use `state: "off"`.

An on entry without brightness does not request a new brightness. During light state enforcement, Occupied keeps a known desired brightness when available; otherwise brightness is left to Home Assistant or the device.

Actual device capabilities still apply. Occupied removes unsupported dimming, color, and transition parameters during light service preparation. A valid configuration cannot add capabilities to a device.

### Switch settings

Switch entries accept only `state: "on"` or `state: "off"`. Brightness, color, and transition fields are rejected.

### Cover settings

Each cover entry accepts exactly one of:

| Field | Accepted value |
| --- | --- |
| `state` | `"open"` or `"closed"`. |
| `position` | Integer from 0 (fully closed) to 100 (fully open). |

Do not combine `state` and `position`. Tilt, stop, and other cover operations use explicit service actions below.

## Explicit light and switch services

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

## Home Assistant scenes

`scene.turn_on` requires exactly one scene entity. Optional `data` is passed to the service, subject to Home Assistant validation:

```yaml
action: scene.turn_on
entities:
  - scene.evening
data:
  transition: 3
```

Use separate actions to activate multiple scenes. Occupied treats scene effects as opaque: it cannot infer affected entities, calculate an inverse, or automatically restore a previous scene.

## Cover services

Use native cover services for movement, position, tilt, and stopping:

| Action | Standard parameters |
| --- | --- |
| `cover.open_cover` | No data needed. |
| `cover.close_cover` | No data needed. |
| `cover.stop_cover` | No data needed. |
| `cover.set_cover_position` | `data: {position: 60}`. |
| `cover.open_cover_tilt` | No data needed. |
| `cover.close_cover_tilt` | No data needed. |
| `cover.stop_cover_tilt` | No data needed. |
| `cover.set_cover_tilt_position` | `data: {tilt_position: 25}`. |

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

## Other entity services

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

Data may contain strings, numbers, booleans, nulls, lists, and nested mappings as permitted by the service. Non-finite numbers and non-JSON values are rejected. Installed service schemas are checked during GUI validation/save without executing the action; the YAML parser alone cannot verify that a service exists or accepts a payload.

Services must fit this entity-targeted format. `event.fire` is explicitly rejected. Home Assistant automation syntax such as `target:`, `service:`, or `service_data:` is not accepted; use Occupied's `action`, `entities`, and `data` fields.

Generic services are opaque to Occupied. It does not infer their device effects, inverse actions, cleanup, or expected state for enforcement.

## Combine actions

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

Each scheduled call reclaims its explicit targets from earlier manual overrides. New manual overrides during dispatch can still cancel affected calls. Opaque scene/script effects do not establish ownership of entities absent from the declared targets.

Blocks allow 1–100 actions and at most 1000 declared entity targets across their members, after per-action deduplication. A `set_state` mapping also has a 1000-entity limit. Planner event budgets can impose additional limits on the resulting schedule. Nested action lists are rejected.

## Staggered action

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

### Staggering in a list

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

### Editing stagger settings

For an eligible light/switch action, open **Advanced settings** and enable **Staggered action**. **Time window** defaults to `2m`. Random events have separate controls for start and end actions. A single validated Custom YAML action can use these controls; multi-action blocks retain their per-action YAML settings. Applying the dialog updates the form; saving the step or event persists it. Cancel leaves the form unchanged.

## Full program YAML

In a complete configuration file, custom blocks belong under `actions`, including single-action blocks. Simple steps can instead use singular `action`/`entities`/`data`/`stagger` fields. Choose one representation per step or event phase; do not combine them.

```yaml
schema_version: 1
name: House
steps:
  sunset_lights:
    timing:
      relative_to: {sun: sunset}
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
    start: {absolute_time: {start: "18:00"}}
    end: {absolute_time: {start: "23:00"}}
    min_duration: 5m
    max_duration: 15m
    count: {min: 2, max: 4}
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

Random event `on` and `off` phases independently accept a singular action or an `actions` list. These are start/end phase names; either phase can contain any supported action. End actions declare their own targets and behavior. They do not automatically reverse the start block. The GUI's reuse-targets shortcut is available for compatible simple controls.

See [examples/custom.yaml](../examples/custom.yaml) for another complete configuration. The schema remains version 1; older installations lacking custom actions or staggering reject the corresponding fields.

## Validation, editing, and export

Quote state strings such as `"on"` and `"off"`, and full-program phase keys `"on"` and `"off"`. The YAML loader otherwise interprets these unquoted words as booleans. Quote clock strings as well.

The editor uses the same strict YAML loader as managed files. It rejects duplicate keys, non-string mapping keys, unsafe tags, recursive aliases, merge keys (`<<`), unknown fields, and inputs larger than 1 MiB. Errors include field paths and source line numbers. Ordinary nonrecursive aliases can be parsed, but export does not preserve the original anchor structure.

Invalid custom text stays available for correction and cannot replace the last valid configuration. Editing a title or timing preserves the complete action block. Switching to simple controls converts a representable single action without losing settings; replacing individual settings or a multi-action block requires an explicit decision. Custom text remains available while the editor is open.

The submit/save flow validates the complete candidate and installed service schemas. In managed-file mode, edits create a draft for export; Occupied does not write the managed source. Deploy the exported configuration and reload it. Moving to GUI storage copies supported action settings.

Export preserves behavior, action order, and service payloads, but normalizes entity ordering and defaults. Original comments, anchors, and formatting are not preserved.

## Runtime and unsupported constructs

Only direct typed light intents contribute to light handover and expected light state. Historical scene and generic service calls are not replayed during activation. Covers have independent position/tilt projection and are future-only by default; configured startup state enforcement can reconcile known cover targets. Covers do not participate in light handover. 

Custom YAML is an action format, not Home Assistant's automation or script language. It does not support templates, conditions, delays, waits, loops, choose/if branches, parallel blocks, nested action lists, variables at the action level, or per-action scheduling fields. Use related scheduled steps for separate times, random events for paired activity, or a Home Assistant script invoked through an entity service for more complex behavior.
