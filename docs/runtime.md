# Daily runtime

Create a controller and author steps in the [editor](editor.md), or deploy [canonical YAML](schema.md). Permission starts disabled. HA provides Enable and pause controls. Use HA automations to turn management permission on/off based on household conditions.

## Activation and dispatch

When permission becomes active, Occupied samples bounded neighboring source dates using its persistent seed. Selected weekdays refer to the source date, beginning at local midnight. Overnight windows and relative steps can execute on adjacent calendar dates. HA timezone/location supply planning context.

Future actions are queued in UTC. Historical generic service calls are marked skipped and never replayed. Each dispatch is durably journaled before the native service call; persistence failure blocks dispatch and deactivates management. Interrupted pending calls become uncertain and are not automatically replayed. Native typed on/off failures have a bounded retry, superseded by newer intents. Missing services/unavailable devices are reported without stalling other steps.

Successful service calls also appear in Home Assistant's **Activity** log under the Occupied controller device and affected entity. Entries identify the action and target, including brightness, transition duration, or cover position when applicable. Scheduled actions, startup handover/state enforcement, the enforcement button, and manual live preview use the same logging. These entries confirm that the service handler completed; they do not confirm physical device movement. Failed, skipped, and uncertain calls are not logged as successful actions. Activity history follows Home Assistant's Recorder retention and filters.

Completed occurrence identities remain stable when a time helper or timestamp/calendar source changes. Source updates reschedule future work without replaying completed steps for the same source date. Restart retains valid sampled plans, seed, journal, handover, ownership, and yielded state. Obsolete cache shapes are rejected and rebuilt without changing version numbers.

## Run condition and delayed state enforcement

Configure an optional **Run condition** in Settings or canonical YAML. For example, `alarm_control_panel.8124_aaa_zone_1_alarm` can allow `armed_away` and `armed_night`. Match any exact configured state; a missing, unknown, or unavailable entity blocks execution. Management permission must remain enabled and scheduling unpaused. A matching condition never overrides either control.

The controller’s Home Assistant device exposes an **Enforce expected state on start** switch, usable from dashboards and automations. Its value persists independently of program edits and managed file reloads. Existing `run_condition.enforce_state_on_start` values seed the switch on its first load; afterward the switch is authoritative. Without a run condition, this switch has no effect on ordinary light handover.

With the switch off (the default), matching starts future scheduled execution and skips startup handover. With enforcement on, Occupied waits for **Delay before enforcing state**, which remains in Settings (default `30s`, configurable from `0s` to `1h`). Scheduled events cannot switch devices during that wait. At its end, Occupied applies the states expected at the actual reconciliation time, including any typed changes scheduled during the delay, and resumes future execution. Historical opaque actions are skipped.

Reconciliation applies known light on/off and brightness/color, switch on/off, and cover position/tilt. This opt-in can move covers even when their target was scheduled earlier. A cover stop makes its affected target unknown; it is never replayed. Already matching, unavailable, disabled, unknown, and opaque targets are skipped with per-entity results. Scenes/scripts/services cannot supply inferred device states. No midnight baseline or unspecified brightness is invented. Commands begin after the delay; device latency and travel time still determine physical completion. The existing ten-minute light handover is not added to this activation.

**When the condition ends, Occupied only stops: no entity commands are sent.** It cancels deadlines, queued actions, retries, and remaining calls without turn-off, restoration, native-transition hold/cancel, or cover-stop calls. Work already delivered to a device may continue. Unknown/unavailable condition states also cause this stop. Permission remains enabled for a later activation.

Moving between allowed states keeps the session and deadline. A later false-to-true activation gets a fresh delay. Enabling permission or resuming while the condition already matches also begins a new qualification delay. Manual changes during the delay yield that entity for the activation. Reconciliation happens once; it does not continuously overwrite manual changes.

A restart cannot establish continuous eligibility across downtime for an unfinished activation, so it starts a fresh delay. Durable completed/uncertain call journals prevent blind replay. Changing the enforcement switch restarts qualification when a run condition is configured: turning it off cancels pending enforcement and resumes future scheduling; turning it on starts a fresh delay if eligible. Condition and delay edits also restart qualification. These changes preserve sampled times, counts, stagger order, and authored-event identity. Title/order-only edits preserve an active deadline. Status exposes the current condition, deadline/countdown, and per-entity reconciliation outcomes/counts.

Read-only Preview stays available regardless of eligibility. Real-device live preview requires the saved controller condition and any draft condition to match, including before every call; condition loss interrupts it without cleanup commands. Its explicit Next-event workflow does not automatically reconcile states or apply the ordinary scheduling startup delay.

## Enforce expected state now

The controller’s Home Assistant device also exposes an **Enforce expected state now** button. Press it to repair state drift immediately, using the current sampled schedule. It works with or without a run condition, independently of the startup-enforcement switch, and skips any remaining startup delay. Permission must be enabled, scheduling unpaused, and any configured run condition must match. The button does not enable or resume management.

This explicit action reclaims previously yielded entities and applies known light, switch, and cover targets. Unknown, unavailable, disabled, already matching, and opaque targets are skipped using the same reconciliation results and Activity entries as startup enforcement. Manual changes during reconciliation still yield those entities, and permission or condition loss cancels remaining calls. No historical scene, script, or generic service action is replayed.

Both the button and delayed startup enforcement use explicit targets from the preceding local calendar day as well as today's actions. Yesterday's evening lighting therefore remains a known target after midnight, until a later action changes or invalidates it, matching Preview's overnight continuity. Actual stagger tick times and overnight actions determine which target is latest. Targets without a known action in either day stay unknown; no baseline is invented. Default light handover retains its current-day projection.

The button cancels pending handover and retries, holds any still-owned native light fades before applying current targets, and resumes future scheduling. Independent targets dispatch concurrently, with at most 32 entities in flight, without scheduled stagger delays or handover fades. Supported lights receive `transition: 0` to override a device's default fade. Commands for separate axes of the same cover remain ordered. Status stays Managing while the button applies targets; reconciliation reports progress and outcomes separately. Stopping management prevents remaining dispatch; already delivered commands can finish.

It preserves the startup switch, configured delay, seed, sampled times, and completed scheduled-event journal. Each press can repair fresh drift, including repeated presses within one activation. It does not continuously enforce device state.

## Known light state and handover

Enabled step actions determine controlled entities. Only direct typed light control can establish a projected light intent. Default handover begins each date Unknown until its first explicit action; activation leaves unknown light state alone. Add a visible midnight step if an initial state is wanted. Explicit enforcement also considers the preceding local day's targets as described above.

Handover reconciles known light intents toward their projected endpoint using the internal ten-minute default. Native transitions are preferred when supported; bounded fallback calls handle other dimmable lights, and stable staggered changes handle non-dimmable lights. An on intent without brightness preserves known/observed brightness or delegates brightness to the device. It never invents a percentage.

Generic service and scene effects are opaque. Occupied does not infer their device changes or inverse actions. Related steps can schedule later actions, but they do not promise lifecycle cleanup or exclusive resource ownership.

Outside manual changes yield an entity until the next activation or an explicit **Enforce expected state now** press. Permission loss, pause, unload, configuration failure, and run-condition loss invalidate queued work immediately. Explicit stop leaves device states; still-owned native fades are held at their observed level without interfering with another actor's transition. Run-condition loss sends no such hold command and leaves device transitions alone.

Missing, unknown, or unavailable state and subsequent recovery do not count as manual control. Availability loss drops ownership and any active handover without sending device commands. Future scheduled actions can run after recovery; missed actions are not replayed. This also applies when a previously owned device is unresolved during restart. A genuine manual override remains yielded across availability changes until the next activation.

## Cover targets and activation

Standard native cover open/close/stop and position/tilt commands supply typed preview targets. Position and tilt remain independent: open/close target 100%/0%, and stop invalidates only the affected target. Each local day's projection starts Unknown; Preview and explicit enforcement also consider the preceding local day's actions for continuity across midnight. Preview does not model travel time or predict the physical position after a stop.

The default cover activation policy is **future only**. Explicit startup state enforcement and the enforcement button are the opt-in exceptions described above. Past cover calls are marked skipped, including position/tilt targets, and ordinary enabling or resuming management never moves covers to a historical target. Covers do not enter the light fade/handover path or receive automatic retries. Future authored commands dispatch normally. Controller stop cancels future work but does not send `cover.stop_cover`, `cover.stop_cover_tilt`, or restoration calls.

Outside state, `current_position`, or `current_tilt_position` changes yield the cover until the next activation, including attribute-only changes while its state remains `open`. Updates with Occupied's service context remain attributable to Occupied; unrelated telemetry attributes do not cause yielding.

## Updates and isolation

Each controller has its own seed, journal, permission, queues, source, and subscriptions. Shared explicitly controlled entities appear as overlap warnings.

Metadata-only edits preserve sampled times, generation, session, and handover deadlines. Behavior edits invalidate future work and recompile. Expected revisions prevent concurrent stale saves. Managed files retain their last valid program on a failed reload; an initially invalid file cannot execute an old GUI cache. See [managed configuration](managed-configuration.md).

Admin `occupied/timeline` reports saved plans and actual journal outcomes. `occupied/diagnostics` returns redacted counts by default, including the latest enforcement phase and applied, matching, failed, and skipped totals; explicit sensitive diagnostics include plans and journal. Pure validate/export/preview operations do not alter the live queue or control devices.

## Manual live preview

The editor's explicit **Start live preview** control freezes one local calendar day's draft plan, using the displayed `preview-1` seed and a verified program/context fingerprint. Neighboring source dates contribute overnight events as they do in read-only Preview. Occurrence identities group multi-target steps while keeping each random start/end and unrelated equal-time event separate. The backend advances only on **Next event**, without schedule waits, handover, or automatic retries.

Live preview pauses the selected controller using its ordinary queue invalidation and transition cleanup. Device dispatch and journal changes use that controller's lock. A separate durable store retains the frozen program/day, owning HA admin, cursor, request results, and per-call outcomes. Pending records must persist before native dispatch and outcomes afterward; any persistence failure blocks remaining calls. Calls carry the owner's HA user context and use a bounded service timeout. Timeouts and restart-interrupted pending calls remain uncertain and are never automatically replayed. Independent calls in one group may succeed despite another member failing, with partial results retained.

Stop invalidates the session immediately, including during an awaited service call. Delivered calls may finish; remaining calls are cancelled. Completion and Stop preserve the controller's pause and leave devices as they are. Explicit normal Resume ends live preview before reevaluating current-time scheduling, respecting management permission; an Occupied Stop command also ends the session. Unload, shutdown, unresolved configuration, and runtime persistence failures interrupt preview. Restart requires a new explicit session.

The preview journal, seed, cursor, and actions remain separate from normal scheduled execution and ownership. Other controllers stay independent; Start and every advance reject declared targets overlapping another running controller/live session. Indirect scene/script effects and unrelated HA automations remain outside that overlap check. See the [manual controls](editor.md#manual-live-preview) for the phone workflow.

## Scheduled staggered activation

Opt-in action staggering creates one shuffled permutation and equally spaced single-target tick events. Persisted plans retain tick times and ordering; fresh transitions use independent random streams without changing timing/count/duration sampling. Tick events have both a parent occurrence identity and a timestamp-specific execution group, so ordered custom blocks retain their failure policy across queued continuations. Other work can dispatch between ticks, and Stop/permission changes invalidate remaining ticks. Newer direct intents supersede older pending ticks. Projection uses actual tick times and ignores superseded ticks.

A manual live preview advance runs one tick execution group rather than all members of the parent occurrence. At the final tick, subsequent ordinary custom actions at that same time retain authored order. Per-call results remain durable and failed custom blocks stay blocked across advances. Tick times represent planned service dispatch; device latency and the existing overdue/recovery and activation handover policies still apply.
