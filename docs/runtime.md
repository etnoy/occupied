# Daily runtime

Occupied runs inside Home Assistant Core 2026.9.4. Canonical daily programs, the pure planner, and the offline CLI share [schema version 1](schema.md). Configure routines through [the editor](editor.md). Authoritative file watching/reload remains Milestone 5.

## Apply a program

Install Occupied and create its single household entry as described in the README. Permission starts disabled. Use the sidebar editor to validate/save a draft, or prepare a program from [examples/house.yaml](../examples/house.yaml), replace its entities and activity names, and validate/preview it with `occupied-config`. Validation and preview do not control devices.

The authenticated HA WebSocket API accepts `occupied/apply` with `config_entry_id` and `program` (a JSON object or YAML string). This admin-only command stores a canonical snapshot. It upgrades a proof entry to the daily engine, or replaces a daily program in place. It neither modifies nor watches the source file. For example, from the HA frontend's browser console:

```javascript
const hass = document.querySelector("home-assistant").hass;
const entries = await hass.callWS({ type: "config_entries/get" });
const entryId = entries.find(entry => entry.domain === "occupied").entry_id;
const yaml = `schema_version: 1
name: My household
activation:
  conditions:
    - condition: state
      entity_id: sensor.alarm
      state: [armed, armed_away]
lighting:
  managed_targets: {entities: [light.hall]}
  baseline:
    - targets: {entities: [light.hall]}
      state: "off"
routines:
  - id: evening
    name: Evening
    steps:
      - id: hall_on
        name: Hall on
        when:
          clock_range: {earliest: "18:00", latest: "18:30"}
        actions:
          - action: turn_on
            targets: {entities: [light.hall]}
            data: {brightness_pct: 60}
      - id: hall_off
        name: Hall off
        when:
          relative_to: hall_on
          offset_range: {fixed: 45m}
        actions:
          - action: turn_off
            targets: {entities: [light.hall]}
`;
await hass.callWS({ type: "occupied/validate", config_entry_id: entryId, program: yaml });
await hass.callWS({ type: "occupied/apply", config_entry_id: entryId, program: yaml });
```

An HA integration can also start Occupied's `import` config flow with canonical JSON/YAML as its data to create the household directly. The ordinary options form remains for proof settings; daily programs are changed through the sidebar editor or apply. Editor saves require the read revision; `occupied/apply` also accepts optional `expected_revision` for API clients. Invalid schema or an infeasible replacement leaves an existing daily program and its queue intact. Metadata-only changes retain sampled times, session, and handover deadlines. Behavior changes replace future work and retain immutable end actions for already-started activities, even if removed from the new program.

## Permission, dry run and status

The sidebar panel exposes enable/disable, pause/resume, and live/dry selection. Dashboard entities include enabled and dry-run switches, status/reason, and the next event. Start/resume reevaluates native HA activation conditions; it cannot bypass them. Missing, unknown, or unavailable dependencies block dispatch, including dependencies inside negated predicates. Changes between two allowed states retain the same session.

Select **Dry run** before enabling a new daily program to inspect its behavior. It uses real activation state and a private virtual device-state overlay for typed controls, leases, handover, and activity conditions. Journal entries record `would_dispatch`; no simulation service calls reach devices. Opaque scripts/scenes have no inferred effects, so conditions dependent on those effects cannot be confirmed automatically in dry run.

Switching mode stops the previous session according to its explicit cleanup policy. Switching a running live session to dry run can therefore send its owned cancellation actions before entering dry mode. Returning to live discards virtual ownership, snapshots real lights, hands over gradually, and schedules future discrete actions only. Simulated past calls are never replayed.

Admin services `occupied.start`, `stop`, `pause`, and `resume` take `config_entry_id`. `occupied.set_dry_run` additionally takes boolean `dry_run`. Normal dashboard controls follow HA entity permissions. The panel/status API shows up to date activity deadlines, handover progress/endpoints, yielded targets, outcomes, and future work. Sensor attributes stay compact.

## Lighting and outside control

Only managed lights with an explicit baseline participate in convergence. At activation, the engine reads observed brightness and projects each target at its handover deadline, including intervening typed intents. Default duration is ten minutes; group overrides can differ. Native `TRANSITION` capability and supported color modes determine service payloads. Otherwise dimmable lights use bounded steps, and on/off-only lights change at staggered times. No initial whole-house on/off sweep occurs. Completion gets one bounded reconciliation if the observed state differs.

Random windows hold per-entity leases. One ending cannot turn off a light held by another interval, or a light already on before Occupied acquired it. Explicit routine intents override random activity; safety-off suppresses later simulation activation for the target that day. Leases spanning the daily boundary remain effective. Opaque actions declaring a managed light resource wait until that light's handover completes.

By default, external changes yield the entity until the next activation. Expected HA contexts and ownership attributes distinguish Occupied writes where possible; ambiguous provenance yields conservatively. Manual changes suppress queued writes and cleanup. Optional `authoritative_simulation` continues lighting intentions, but it never makes arbitrary activity cleanup safe without matching ownership. Stop/disarm/pause leaves light states by default; `turn_off_owned` affects only still-owned lights. Still-owned native fades are cancelled by holding observed brightness; a yielded fade is left to its external controller.

## Timed activities

Declare exclusive resources, explicit start/end actions, and ownership predicates such as Harmony's `current_activity`. Unavailable resources, failed start conditions, or a remote/media player already in use without explicit start conditions skip the start. Successful dispatch is followed by at most three seconds of observed ownership confirmation. The duration begins after the last successful start action, including stagger/latency, and that deadline never slides because of confirmation or restart.

The runtime rechecks the enclosing day/`within` window after a late start. If the actual lifecycle no longer fits, it runs only configured owned cancellation. Partial-start cancellation touches acquired resources only. Give opaque rollback scripts separate resource-specific actions when their effects cannot be safely split; a rollback that also touches unacquired resources is suppressed with an outcome.

Outside state/activity changes, including separate ownership observer entities, release the lifecycle and suppress its end. `end_if_owned` is the default stop policy; `leave_running` explicitly releases ownership without cleanup. Generic inverses are never inferred. Actual end offsets and actions are captured at start, so editing a program cannot replace an in-progress lifecycle's cleanup.

## Persistence and recovery

Atomic HA stores retain permission, canonical program snapshots, sampled plans/date seeds, pre/post-dispatch journal entries, contexts, leases, observed ownership, native fades, handover endpoints, and activity snapshots/deadlines. Daily seeds derive independently from a persisted household seed. The date cache expands for declared cross-boundary work, including multi-day leases at cold startup. The daily boundary samples the next date without starting a new activation session. Effective timezone/location changes recompile future timing while retaining owned cleanup.

An HA restart waits for known activation state, restores sampled times, resumes remaining convergence toward its saved deadline, and restores owned activity ends without replaying starts. Overdue ends run only with trustworthy matching ownership; historical discrete actions are skipped. Invalid saved plans regenerate future work while keeping valid lifecycle snapshots. Interrupted `pending` calls become `uncertain` rather than being blindly replayed.

Normal entry reload/unload invalidates timers and explicitly cleans still-owned activities while services are available. HA shutdown preserves recoverable activities without depending on cleanup services. Device calls and local storage are not a distributed transaction: exactly-once physical execution is not promised. Uncertain generic cleanup and failed end services are recorded; they cannot guarantee the device stopped.

Service calls have a ten-second timeout, dispatch batches are capped at 64 events, and idempotent discrete state controls have at most one retry. Generic retries require `replay_safe`; activity starts/cleanup do not get automatic opaque replay. A stale retry is suppressed after a newer command for its resource. Failed/unavailable targets do not stall unrelated work. Failed persistence stops new dispatch before another device call; enabling/resuming retries storage, or reload the entry after resolving the failure. Permission and ownership are rechecked after the journal write immediately before dispatch.

Live compilation rejects programs whose maximum expansion exceeds 50,000 events/10,000 intervals per date, 200,000 cached events, or a 31-date distance in either direction. The journal retains at most 50,000 entries, pruning older finished/historical records while protecting interrupted calls and active cleanup. These live limits apply in addition to the pure schema limits. A rejected daily apply preserves the last valid program.

## Diagnostics

HA's integration diagnostics and admin `occupied/diagnostics` omit household names, entity IDs, service data, and detailed error text by default. Known credential fields remain redacted even in a sensitive export. To export the actual sampled plans, convergence endpoints, lifecycle snapshots, and journal, explicitly set `include_sensitive: true`:

```javascript
const diagnostics = await hass.callWS({
  type: "occupied/diagnostics",
  config_entry_id: entryId,
  include_sensitive: true,
});
```

`occupied/status` is also admin-only and includes household details used by the panel. Preview commands remain read-only and use separate seeds. Tests exercise real HA APIs with virtual devices on HA 2026.9.3 and 2026.9.4. Physical-device behavior and hardware soak remain deployment acceptance work. [Managed source reload](managed-configuration.md) uses this engine and preserves active immutable cleanup snapshots; [installation](installation.md) covers upgrades, troubleshooting and removal.
