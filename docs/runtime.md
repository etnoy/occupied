# Daily runtime

Create a controller and author steps in the [editor](editor.md), or deploy [canonical YAML](schema.md). Permission starts disabled. HA provides management, pause, and dry-run controls. Use HA automations to turn management permission on/off based on household conditions.

## Activation and dispatch

When permission becomes active, Occupied samples bounded neighboring source dates using its persistent seed. Selected weekdays refer to the source date, beginning at local midnight. Overnight windows and relative steps can execute on adjacent calendar dates. HA timezone/location supply planning context.

Future actions are queued in UTC. Historical generic service calls are marked skipped and never replayed. Each dispatch is durably journaled before the native service call; persistence failure blocks dispatch and deactivates management. Interrupted pending calls become uncertain and are not automatically replayed. Native typed on/off failures have a bounded retry, superseded by newer intents. Missing services/unavailable devices are reported without stalling other steps.

Completed occurrence identities remain stable when a time helper or timestamp/calendar source changes. Source updates reschedule future work without replaying completed steps for the same source date. Restart retains valid sampled plans, seed, journal, handover, ownership, and yielded state. Obsolete cache shapes are rejected and rebuilt without changing version numbers.

## Known light state and handover

Enabled step actions determine controlled entities. Only direct typed light control can establish a projected light intent. Each date begins Unknown until its first explicit action; activation leaves unknown light state alone. Add a visible midnight step if an initial state is wanted.

Handover reconciles known light intents toward their projected endpoint using the internal ten-minute default. Native transitions are preferred when supported; bounded fallback calls handle other dimmable lights, and stable staggered changes handle non-dimmable lights. An on intent without brightness preserves known/observed brightness or delegates brightness to the device. It never invents a percentage.

Generic service and scene effects are opaque. Occupied does not infer their device changes or inverse actions. Related steps can schedule later actions, but they do not promise lifecycle cleanup or exclusive resource ownership.

Outside manual changes yield an entity until the next activation. Permission loss, pause, unload, and configuration failure invalidate queued work immediately. Stop leaves device states; still-owned native fades are held at their observed level without interfering with another actor's transition.

## Cover targets and activation

Standard native cover open/close/stop and position/tilt commands supply typed preview targets. Position and tilt remain independent: open/close target 100%/0%, and stop invalidates only the affected target. Each local calendar date starts Unknown. Preview does not model travel time or predict the physical position after a stop.

The cover activation policy is **future only**. Past cover calls are marked skipped, including position/tilt targets, and enabling or resuming management never moves covers to a historical target. Covers do not enter the light fade/handover path or receive automatic retries. Future authored commands dispatch normally. Controller stop cancels future work but does not send `cover.stop_cover`, `cover.stop_cover_tilt`, or restoration calls.

Outside state, `current_position`, or `current_tilt_position` changes yield the cover until the next activation, including attribute-only changes while its state remains `open`. Updates with Occupied's service context remain attributable to Occupied; unrelated telemetry attributes do not cause yielding.

## Dry run, updates, and isolation

Dry run uses a virtual state map and records would-dispatch outcomes without calling native services. Live observed state remains unchanged. Each controller has its own seed, journal, permission, queues, source, and subscriptions. Shared explicitly controlled entities appear as overlap warnings.

Metadata-only edits preserve sampled times, generation, session, and handover deadlines. Behavior edits invalidate future work and recompile. Expected revisions prevent concurrent stale saves. Managed files retain their last valid program on a failed reload; an initially invalid file cannot execute an old GUI cache. See [managed configuration](managed-configuration.md).

Admin `occupied/timeline` reports saved plans and actual journal outcomes. `occupied/diagnostics` returns redacted counts by default; explicit sensitive diagnostics include plans and journal. Pure validate/export/preview operations do not alter the live queue or control devices.

## Manual live preview

The editor's explicit **Start live preview** control freezes one local calendar day's draft plan, using the displayed `preview-1` seed and a verified program/context fingerprint. Neighboring source dates contribute overnight events as they do in read-only Preview. Occurrence identities group multi-target steps while keeping each random start/end and unrelated equal-time event separate. The backend advances only on **Next event**, without schedule waits, handover, or automatic retries.

Live preview pauses the selected controller using its ordinary queue invalidation and transition cleanup. Device dispatch and journal changes use that controller's lock. A separate durable store retains the frozen program/day, owning HA admin, cursor, request results, and per-call outcomes. Pending records must persist before native dispatch and outcomes afterward; any persistence failure blocks remaining calls. Calls carry the owner's HA user context and use a bounded service timeout. Timeouts and restart-interrupted pending calls remain uncertain and are never automatically replayed. Independent calls in one group may succeed despite another member failing, with partial results retained.

Stop invalidates the session immediately, including during an awaited service call. Delivered calls may finish; remaining calls are cancelled. Completion and Stop preserve the controller's pause and leave devices as they are. Explicit normal Resume ends live preview before reevaluating current-time scheduling, respecting management permission and dry run; an Occupied Stop command also ends the session. Unload, shutdown, unresolved configuration, and runtime persistence failures interrupt preview. Restart requires a new explicit session.

The preview journal, seed, cursor, and actions remain separate from normal scheduled execution, ownership, and dry-run virtual states. Other controllers stay independent; Start and every advance reject declared targets overlapping another running controller/live session. Indirect scene/script effects and unrelated HA automations remain outside that overlap check. See the [manual controls](editor.md#manual-live-preview) for the phone workflow.
