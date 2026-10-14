# Custom YAML actions

Choose **Custom YAML** in the Action dropdown to edit one action or an ordered list of actions. The usual controls still set the title, timing, weekdays, and enabled state. Custom YAML is also available for each random event's start and end.

Switching from an existing action generates equivalent YAML using the current form values. Group on/off becomes an entity-state mapping; covers, services, and scenes retain their existing service name, targets, and data. No devices are controlled by switching editors or validating text.

## Individual states

```yaml
action: set_state
entities:
  light.sofa_lamp:
    state: "on"
    brightness: 128
    rgb_color: [255, 80, 0]
    transition: 3
  light.reading_lamp:
    state: "on"
    brightness: 200
    color_temp_kelvin: 2700
  switch.window_lights:
    state: "on"
  cover.living_room:
    position: 40
  cover.bedroom:
    state: "closed"
```

`set_state` is an Occupied action using a Home Assistant scene-style entity mapping. It dispatches ordinary light, switch, and cover calls; it does not create a Home Assistant scene.

| Entity | Supported settings |
| --- | --- |
| Light on | Required `state: "on"`; optional `brightness`, `rgb_color`, `hs_color`, `color_temp_kelvin`, `transition` |
| Light off | Required `state: "off"`; optional `transition` |
| Switch | Required `state: "on"` or `state: "off"` |
| Cover | Either `state: "open"`/`state: "closed"` or `position: 0–100` |

Quote state strings. `brightness` is an integer from 1 to 255, where 255 is full brightness. The new state mapping accepts only `brightness`, not `brightness_pct`; existing service actions retain their previous data support. Use state off rather than brightness zero.

RGB takes three integers from 0 to 255. HS takes hue 0–360 and saturation 0–100. Kelvin controls white temperature. Use only one color representation per light. Transitions are nonnegative seconds. Actual support depends on the device; unsupported light settings follow Occupied's existing capability-aware service preparation. An on entry without brightness does not request a new brightness.

For covers, 0 is closed and 100 is fully open. Do not specify both state and position. Tilt and stop are available through explicit cover service actions. Covers retain their existing preview projection and future-only execution; light handover does not replay historical cover calls.

## Combine actions

```yaml
- action: set_state
  entities:
    light.sofa_lamp:
      state: "on"
      brightness: 20
    cover.living_room:
      position: 40

- action: scene.turn_on
  entities: [scene.evening]

- action: cover.stop_cover
  entities: [cover.bedroom]
```

All actions share one scheduled occurrence and activation time. Calls run in list order. Entity mappings are canonicalized by entity ID, so mapping order is not an execution-order control. Use separate actions in the list when order matters.

A failed call stops the remaining calls in the block. Calls already completed are not rolled back; custom blocks are not retried as a whole. Permission changes stop remaining dispatch. Disabled/unavailable typed targets and manually yielded entities retain their existing skip policies. Results are recorded per call. Scenes and generic services remain opaque: Occupied cannot infer which other entities they affect, and handover does not replay them.

Custom YAML supports the existing `action`, `entities`, and optional `data` fields. Use entity lists for existing services and an entity mapping for `set_state`. Targets belong in `entities`, not in service data. Templates, delays, conditions, loops, parallel blocks, and nested action lists are not supported. Blocks support at most 100 actions and 1000 declared targets/calls; the existing planner budget also applies.

## Editing, validation, and storage

The code editor accepts the action mapping or list itself, without an enclosing `actions:` key or a complete program. Syntax and entity-state validation use the same strict YAML parser as managed files, including duplicate-key rejection. Errors include block line numbers. Invalid text stays available for correction and cannot replace the last valid configuration.

Switching back to simple controls converts a representable single action without losing settings. Replacing individual settings or a multi-action block requires an explicit decision. Custom text remains available while the editor is open. Editing titles or timing preserves the complete action block.

The existing submit/save flow validates the whole candidate and installed service schemas. In managed-file mode, edits create a draft for export; Occupied never writes the managed source. Deploy the exported configuration and reload it. Moving to GUI storage copies all supported action settings.

## Full program YAML

Custom actions are saved under `actions`, even when there is only one. Existing simple steps retain `action`/`entities`/`data`. Choose one representation per step; never specify both.

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
        entities: [scene.evening]
```

For random events, either `on` or `off` may contain an `actions` list instead of a singular action. End actions declare their own targets; the GUI's reuse-targets shortcut remains available for compatible simple controls. Export preserves behavior and action order, but not original comments, anchors, or formatting. Schema version remains 1; installations without Custom YAML support reject the new action/mapping/list shapes.
