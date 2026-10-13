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

## Dry run, updates, and isolation

Dry run uses a virtual state map and records would-dispatch outcomes without calling native services. Live observed state remains unchanged. Each controller has its own seed, journal, permission, queues, source, and subscriptions. Shared explicitly controlled entities appear as overlap warnings.

Metadata-only edits preserve sampled times, generation, session, and handover deadlines. Behavior edits invalidate future work and recompile. Expected revisions prevent concurrent stale saves. Managed files retain their last valid program on a failed reload; an initially invalid file cannot execute an old GUI cache. See [managed configuration](managed-configuration.md).

Admin `occupied/timeline` reports saved plans and actual journal outcomes. `occupied/diagnostics` returns redacted counts by default; explicit sensitive diagnostics include plans and journal. Pure validate/export/preview operations do not alter the live queue or control devices.
