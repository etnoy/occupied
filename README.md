# Occupied

Occupied is a native Home Assistant custom integration for authored occupancy simulation. Home Assistant starts the engine, watches activation entities, and calls device services through its own timers. The bundled panel shows status and controls permission.

**Current checkpoint: implementation-plan Milestone 1.** This version proves the complete caller chain with a deterministic sequence. The stochastic daily planner, complete routine editor, managed YAML, and durable activity recovery are later stages.

The authoritative implementation plan is [../plans/OCCUPIED_PLAN.md](../plans/OCCUPIED_PLAN.md). Keep it updated throughout implementation with scope decisions, progress, verification results, and remaining work.

## Compatibility

The initial supported and tested baseline is **Home Assistant Core 2026.9.4**, the latest stable release verified when implementation began on 2026-10-06. Its [Python requirement is >=3.14.2](https://github.com/home-assistant/core/blob/2026.9.4/pyproject.toml). Development was verified on Python 3.14.8. The 2026.10 beta and other HA versions have not been tested. See [the pinned release](https://github.com/home-assistant/core/releases/tag/2026.9.4).

## Install the checkpoint

1. Copy `custom_components/occupied/` into `<HA config>/custom_components/occupied/`, including `frontend/` and `translations/`.
2. Restart Home Assistant.
3. Open **Settings → Devices & services → Add integration → Occupied**.
4. Select one proof light, an optional activation entity and its allowed states, and an optional Harmony remote/activity. Only select devices you want this sequence to operate.
5. Turn on the new **Occupied House Enabled** switch or use **Enable** in the Occupied sidebar panel. Permission initially defaults to disabled.

There is one household entry. Edit its settings through **Configure** on the integration entry. Options changes reload the integration. No frontend build or separate runtime is needed. HACS/release automation is planned for Milestone 5.

## What the sequence does

Each false-to-true activation starts one deterministic session:

1. Read the light's observed on/off state and brightness. Gradually converge to the configured brightness over the handover duration, default **600 seconds**. Dimmable lights use evenly spaced steps of at most 30 seconds; a non-dimmable light changes at completion. No initial all-on/all-off sweep occurs. A zero-second handover requests immediate application.
2. Turn the light on at the configured delay after handover, then off after the configured light duration.
3. If configured and currently off, call `remote.turn_on` with the exact activity name after its configured delay. Queue a separate `remote.turn_off` for the configured duration after successful start dispatch. No sleep holds the activity open.

The default target brightness is 70%; the light starts its pair 60 seconds after handover and remains on for 120 seconds. The remote starts 90 seconds after handover and runs for 2700 seconds (45 minutes). For a quick caller proof, set the handover to 60 seconds and use shorter delays/durations.

Activation comparison uses literal, case-sensitive stored states. For example, `armed` and `armed_away` are two allowed values for the same entity. Switching between allowed states retains the session, its handover deadline, and pending events. Missing, unknown, or unavailable activation dependencies block execution. Leaving the activation entity empty gives manual switch control.

Enabled permission persists independently of activation. Stop/disarm/pause cancels pending light actions and holds the observed lighting state. An owned remote activity receives its explicit end cleanup. A remote already in use is skipped; outside remote state/activity changes release ownership and suppress its end action. Outside light changes yield that light for the remainder of the session. Service errors are reported and unrelated events continue.

The normal dashboard switch follows Home Assistant entity permissions. These administrative integration services require `config_entry_id`:

```yaml
action: occupied.start
data:
  config_entry_id: YOUR_ENTRY_ID
```

`occupied.stop`, `occupied.pause`, and `occupied.resume` use the same field. Start/resume always recheck the gate. The admin panel reads its timeline through the authenticated `occupied/status` WebSocket command. Closing it has no effect on execution.

## Checkpoint limits

The schedule is one proof session per activation, rather than a daily household program. Its handover endpoint is explicitly configured for one light; a daily desired-state reducer and native-fade policy are planned. A device service's successful completion proves dispatch, not physical delivery.

Permission and pause survive reload/restart. Sampled plans, activity ownership/deadlines, and execution journals are not persisted yet. Reload or resume starts a new deterministic proof session after gate evaluation; reload first ends a still-owned remote activity. HA shutdown cancels work without depending on device services. A remote may remain running during an outage and does not yet have restart recovery. Use this checkpoint for development proof; Milestone 3 adds durable runtime recovery.

Unload removes the panel, state/startup/shutdown listeners, and timer. HA's static asset API has no route-unregister operation, so a single configuration-free JS asset route remains registered and is reused on reload. No household data is embedded in it.

## Development and verification

Install [uv](https://docs.astral.sh/uv/) and run:

```sh
uv sync --python 3.14 --locked
uv run pytest
uv run ruff check custom_components tests
uv run ruff format --check custom_components tests
```

`uv.lock` pins the complete test environment, including the HA frontend package. Tests load the integration through real Home Assistant config entries, entities, native conditions, timers, HTTP, and WebSocket APIs. Only physical light/remote handlers are virtual services in HA's real registry. Accelerated-clock tests verify gradual changes, already-true startup gating, both allowed states, permission persistence, in-flight cancellation, remote deadlines/ownership, browser closure, config/options flows, reload/unload, and dispatch failures. No existing HA installation or physical devices are modified by these tests.
