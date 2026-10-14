# YAML redesign plan

Status: implemented with schema_version: 1 and unchanged package/planner versions. See schema.md for the current contract.

The GUI is the source of truth for user concepts and behavior. The new YAML should describe the same steps users create and edit, without adding hidden scheduling containers or light state assumptions. Treat this as a breaking greenfield change: support one canonical schema, with no legacy aliases or routine compatibility layer.

## Proposed configuration

```yaml
schema_version: 1
name: Occupied
steps:
  step:
    name: Fönsterspottar badrum on
    days: [mon, tue, thu, fri, sat, sun]
    timing:
      absolute_time:
        start: '18:00'
    action: turn_on
    entities: [light.fonsterspottar_badrum]

  step_2:
    name: Fönsterspottar badrum off
    days: [mon, wed, fri, sat, sun]
    timing:
      absolute_time:
        start: '17:00'
        end: '19:00'
    action: turn_off
    entities: [light.fonsterspottar_badrum]

  step_3:
    name: Spis AutomaticZoneSelection on
    timing:
      relative_to:
        sun: sunrise
    action: turn_on
    entities: [switch.spis_cooking_hob_setting_automaticzoneselection]
```

This retains the example's explicit step actions and weekdays. It deliberately removes its initial on baseline; startup behavior is specified below. Omitting `days` means every day. Omitting an end means a fixed time. Omitting offsets means zero.

`steps` is a mapping keyed by stable IDs. The ID appears once, as the key, and the step definition is directly beneath it. There is no `step_schedule`, nested `steps`, or repeated `id`. Mapping insertion order can preserve the editor's presentation order; scheduling and random sampling must not depend on that order. Keep duplicate YAML key rejection.

## Names and structure

| Current configuration | Replacement |
| --- | --- |
| `routines[].steps[]` | `steps.<step_id>` |
| Routine IDs and names such as `step_schedule` | Remove |
| `when` | `timing`, matching the GUI section |
| `clock_range.earliest` / `latest` | `absolute_time.start` / optional `end` |
| Separate `sun_range`, `entity_range`, and step-relative forms | One `relative_to` form with a typed source |
| `offset_range.fixed` / `min` / `max` | `start_offset` / optional `end_offset` |
| One-element `actions` list | Singular `action` |
| `targets.entities` | Direct `entities` list |
| `lighting.managed_targets` | Derived internal entity sets |
| `lighting.baseline` | Remove; explicit steps establish intended state |
| `defaults.handover` plus `lighting.handover` | One internal handover configuration |
| `cross_midnight` and `allow_cross_boundary` | Infer overnight scheduling from times and relative offsets |

Use one schema shape rather than accepting both scalars and objects, lists and maps, or alternate spellings for the same concept.

Timing has exactly one branch: `absolute_time` or `relative_to`. Absolute start/end delimit the window in which a single action occurs; end is not a turn-off deadline or a duration. Equal bounds normalize to a fixed time. Unequal bounds use uniform sampling.

Relative timing has exactly one source key: `step`, `sun`, or `entity`. Offsets are siblings of the source within `relative_to`:

```yaml
timing:
  relative_to:
    step: step
    start_offset: 30m
    end_offset: 1h
```

The other source forms are `sun: sunset`, `entity: sensor.phone_next_alarm`, and `entity: calendar.work` with `attribute: start_time` or `end_time`. Preserve all six solar events already offered by the picker. A missing end offset equals the start offset. Signed h/m/s durations remain supported. References stay typed; never rewrite arbitrary service data when renaming a step.

For actions, `turn_on` and `turn_off` control the selected lights/switches. A qualified action such as `cover.set_cover_position` corresponds to the GUI's entity service action, with an optional native `data` mapping. `scene.turn_on` corresponds to Activate Home Assistant scene and requires one scene. Do not add a separate action-type discriminator that repeats what `action` already identifies. Split mixed light/switch calls internally, not into multiple YAML actions.

## Runtime decisions required by removing lighting

Removing the YAML fields alone would break projection and handover: the current implementation projects only explicitly managed, baselined lights.

Derive controlled entities from enabled steps. Maintain separate internal sets for direct typed light control, switches, and opaque services/scenes; do not treat every entity target as a projectable light. Use the same derivation for runtime listeners, controller overlap warnings, diagnostics, and preview.

Replace hidden on/off baselines with unknown state until an explicit typed action establishes an intent for the current local schedule date. Before that, activation leaves the device's current state alone and preview displays Unknown. A user who wants an initial on/off state can create a visible step at the start of the day. This is an intentional change from both the example's on baseline and the builder's automatic off baseline.

Keep gentle handover for known typed light intents, manual-control yielding, and ownership checks. Reconcile known state without replaying historical generic calls. Scenes and services remain opaque; do not infer their controlled lights, inverses, or brightness. Preserve observed brightness when an on action supplies none; remove the hidden 70% fallback. Missing observations must not invent a brightness setting.

Handover mechanics can retain one internal default. User-configurable controller behavior should have a concrete GUI control and one public setting before entering this schema; remove duplicated overrides and single-choice implementation knobs from public YAML.

## Other simplifications

1. **Remove routine inheritance.** Weekdays and enabled state belong to the step. Eliminate routine probability gates and program → routine → item default merging. There should be no hidden container to clone when a user widens a step's weekdays.
2. **Use local calendar dates.** Remove the hidden 02:00 day boundary. An absolute end before its start means the next day. A relative step follows its parent's occurrence, including across midnight; its selected weekdays filter the parent's source date. For example, a Monday 23:50 parent plus 30m runs Tuesday 00:20 as part of Monday's occurrence. Calendar and dated timestamp sources retain their reported date. Keep bounded planning across dates, elapsed-time offsets, and defined DST behavior.
3. **Make titles optional consistently.** Creating and editing must both allow an absent `name`. Generate display labels from the action and entity names without writing them into YAML. Keep the stable ID independent of titles; renaming a title must not select a new random stream.
4. **Remove ignored timing options.** Step start sampling is already uniform, yet legacy distribution/mode fields are accepted and included in the behavior hash. Reject these fields and remove their hash contribution. Omitted defaults and explicit equivalent values must have the same behavior hash.
5. **Limit the public schema to supported GUI steps.** Remove multi-action sequences, timed activities, repeated activity windows, probability controls, resource declarations, weighted target selection, stagger, and inherited defaults from this new public schema. The current GUI lists several of these as steps but cannot edit them. Reintroduce them only as deliberate GUI features with complete editing and preview behavior. Do not convert lifecycle activities into unrelated start/end steps, which would lose their ownership and cleanup guarantees.
6. **Keep useful controller behavior without configuration clutter.** HA supplies timezone/location; offline CLI previews supply them as context. Keep explicit schema versioning to reject obsolete files. Runtime permission, dry-run, and activation controlled through HA remain separate from step definitions. Retire YAML-only activation/policy overrides from this schema; controller controls or HA automations should expose any needed choices. Preserve the current ownership/yielding and future-only execution safeguards internally.
7. **Export compact, stable YAML.** Omit all-week selections, `enabled: true`, zero offsets, equal end bounds, empty service data, and internal defaults. Normalize zero-second clocks to `HH:MM`; retain meaningful seconds. Preserve Unicode and authored step presentation order. Do not normalize opaque service data as configuration or reorder meaningful payload lists.
8. **Finish the terminology cleanup.** Rename the `routines` tab identifier, routine CSS/data attributes, error paths, CLI resource kinds, API types, examples, and documentation. Derive validation paths such as `steps.step_2.timing.absolute_time.end` directly from the new model. Do not keep obsolete terminology hidden behind updated GUI text.

## Implementation order

1. **Define the new contract.** Replace Python program/step/timing models; generate the JSON Schema; specify defaults, typed references, date semantics, compact export, and schema-version errors. New imports reject removed fields with actionable errors. Keep schema_version: 1. No automatic migration or dual-schema parser.
2. **Update shared parsing and planning.** Move validation, rename/delete dependencies, deterministic sampling, behavior hashing, source revisions, and CLI preview/export to the flat step map. Remove routine traversal, compatibility sampling fields, and unsupported activity/window planning from the new contract.
3. **Update runtime and state projection.** Derive entity sets centrally, implement unknown-before-first-intent state, and align handover, listeners, ownership, dry run, cross-date queues, and persisted plan identities with the new model. Keep version numbers unchanged; reject obsolete cache shapes so cached plans cannot be replayed. Any transition out of an active old runtime must settle or retain already-captured cleanup before replacing its program.
4. **Update the editor and preview together.** Use the same map directly in frontend drafts and backend APIs. Remove container creation/cloning, automatic lighting mutations, mixed-domain serialization splits, and the read-only custom-step fallback for removed features. Update optional-title handling, source picking, field error mapping, delete/rename dependencies, timeline projection, and internal routine terminology. Regenerate shipped frontend assets.
5. **Replace examples and documentation.** Update starter programs, schema/editor/runtime/managed-file guides, CLI examples, release checks, and fixtures. Document the breaking change and the baseline/date behavior changes explicitly. Remove instructions for retired feature surface.

## Acceptance criteria

- Every supported YAML step can be opened, edited, and saved through the GUI without lost fields or changed meaning.
- GUI → YAML → import → GUI preserves action, source, offsets, selected weekdays, enabled state, and stable identity. Repeated exports stabilize after one normalization.
- Fixed/windowed absolute times, all solar events, helper/timestamp/calendar sources, signed offsets, overnight references, and DST transitions plan consistently in CLI, GUI preview, and runtime.
- Renaming titles or reordering unrelated steps preserves sampled times and active handover deadlines; typed ID renames update references atomically.
- Unknown pre-action state does not cause a service call. Typed intents hand over correctly, scenes/services remain opaque, manual control yields, and dry run stays isolated.
- Obsolete wrappers/fields, duplicate IDs/keys, invalid sources, cycles, conflicting weekday dependencies, and unsupported actions fail with useful paths and YAML locations. A disabled/missing parent skips dependent occurrences consistently.
- Example imports and generated JSON Schema agree. Relevant backend/frontend tests pass, followed by existing schema/artifact, build, lint, type, and formatting checks.

## Findings from the original implementation

- [Step serialization](../custom_components/occupied/frontend/src/lib/models/step-model.ts) creates the `_schedule` routine, nested step, split action lists, and managed-light baseline.
- [Timing editor](../custom_components/occupied/frontend/src/lib/components/shared/TimingEditor.svelte) exposes Absolute time, Relative to, start/end bounds, and offsets.
- [Action editor](../custom_components/occupied/frontend/src/lib/components/shared/ActionEditor.svelte) exposes one action type, entities, and service data.
- [Step editor controller](../custom_components/occupied/frontend/src/lib/controllers/step-editor-controller.ts) writes generated titles on creation; step validation requires titles on later edits.
- [Models](../custom_components/occupied/models.py), [validation and hashing](../custom_components/occupied/validation.py), and [planner](../custom_components/occupied/planner.py) retain routine inheritance and compatibility timing fields.
- [Lighting projection](../custom_components/occupied/lighting.py), [daily runtime](../custom_components/occupied/engine_daily.py), and [preview timeline](../custom_components/occupied/frontend/src/lib/utils/timeline.ts) depend on managed targets and baselines.
- [Steps view](../custom_components/occupied/frontend/src/lib/components/steps/StepsView.svelte) presents unsupported imported behaviors as custom steps that cannot be edited with the simple editor.
- [YAML exporter](../custom_components/occupied/file_config.py) already omits default values and all-week selections; build on that work.
