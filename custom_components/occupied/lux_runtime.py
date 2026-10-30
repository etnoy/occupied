"""Owned HA observation timers; all terminal resolutions use the engine lock."""

import hashlib
import heapq
import json
from datetime import date, datetime

from homeassistant.core import callback
from homeassistant.helpers.event import async_track_point_in_utc_time
from homeassistant.util import dt as dt_util

from .lux import Qualification, evaluate, sensor_lux
from .planner import RandomStreams
from .runtime_planning import runtime_dates
from .validation import ProgramError, behavior_hash


class LuxRuntime:
    def __init__(self, engine):
        self.engine = engine
        self.identity = None
        self.records = {}
        self.qualifications = {}
        self.observed = set()
        self.cancel_timer = None
        self.pending_task = False

    @property
    def entities(self):
        return {
            step.timing.lux.entity_id
            for step in self.engine.program.steps.values()
            if step.timing.lux
        }

    def reconcile(self):
        engine = self.engine
        identity = hashlib.sha256(
            json.dumps(
                [
                    behavior_hash(engine.program),
                    engine.hass.config.time_zone,
                    engine.hass.config.latitude,
                    engine.hass.config.longitude,
                    engine.hass.config.elevation,
                ]
            ).encode()
        ).hexdigest()
        if identity != self.identity:
            self.stop()
            self.records.clear()
            self.identity = identity

    def restore(self, saved):
        self.reconcile()
        if not isinstance(saved, dict) or saved.get("identity") != self.identity:
            return
        records = saved.get("records", {})
        if not isinstance(records, dict):
            return
        for key, record in records.items():
            try:
                source_date, step_id = key.split(":", 1)
                date.fromisoformat(source_date)
                if (
                    step_id not in self.engine.program.steps
                    or not self.engine.program.steps[step_id].timing.lux
                ):
                    continue
                if record["at"] is not None and datetime.fromisoformat(record["at"]).tzinfo is None:
                    continue
                self.records[key] = record
            except (ValueError, TypeError, KeyError):
                continue

    def snapshot(self):
        self.reconcile()
        return {"identity": self.identity, "records": dict(self.records)}

    def resolutions(self):
        self.reconcile()
        result = {}
        for key, record in self.records.items():
            source_date, step_id = key.split(":", 1)
            result.setdefault(source_date, {})[step_id] = record["at"]
        return result

    def stop(self):
        if self.cancel_timer:
            self.cancel_timer()
            self.cancel_timer = None
        self.qualifications.clear()
        self.observed.clear()

    def occurrences(self):
        return [
            item
            for plan in self.engine._plans.values()
            for item in plan.pending_occurrences
            if "entity_id" in item
        ]

    def reading(self, entity):
        state = self.engine.hass.states.get(entity)
        return sensor_lux(state.state, state.attributes) if state else None

    def sensor_changed(self, entity, state):
        # Reset synchronously, including short false/unavailable reports while a
        # service handler holds the engine lock. Never credit an unobserved gap.
        reading = sensor_lux(state.state, state.attributes) if state else None
        for item in self.occurrences():
            if item["entity_id"] != entity:
                continue
            spec = self.engine.program.steps[item["source_id"]].timing.lux
            matches = reading is not None and (
                reading > spec.above if spec.above is not None else reading < spec.below
            )
            if not matches:
                self.qualifications.pop(f"{item['source_date']}:{item['source_id']}", None)
        self.arm()

    def arm(self):
        if self.cancel_timer:
            self.cancel_timer()
            self.cancel_timer = None
        engine = self.engine
        if not engine.active or engine.activation_deadline or engine.live_preview.running:
            return
        occurrences = self.occurrences()
        if not occurrences:
            return
        generation = engine.generation

        if not self.pending_task:
            self.pending_task = True
            engine.hass.async_create_task(self.refresh(generation))

    async def refresh(self, generation):
        engine = self.engine
        async with engine._lock:
            try:
                if (
                    generation != engine.generation
                    or not engine.active
                    or not engine._effective_gate()[0]
                    or engine.live_preview.running
                ):
                    return
                now = dt_util.utcnow()
                dates = {
                    str(day)
                    for day in runtime_dates(
                        engine.program,
                        now.astimezone(dt_util.get_time_zone(engine.hass.config.time_zone)).date(),
                    )
                }
                self.records = {
                    key: record
                    for key, record in self.records.items()
                    if key.split(":", 1)[0] in dates
                }
                next_times = []
                resolved = []
                for item in self.occurrences():
                    key = f"{item['source_date']}:{item['source_id']}"
                    start, end = (
                        datetime.fromisoformat(item["start"]),
                        datetime.fromisoformat(item["end"]),
                    )
                    if key in self.records:
                        continue
                    if now < start:
                        next_times.append(start)
                        continue
                    spec = engine.program.steps[item["source_id"]].timing.lux
                    missed = now >= end and (
                        key not in self.observed or (now - end).total_seconds() > 300
                    )
                    if now < end:
                        self.observed.add(key)
                    state = self.qualifications.setdefault(key, Qualification())
                    delay = (
                        RandomStreams(engine._seed)
                        .rng("lux_delay", key)
                        .uniform(
                            spec.delay.min,
                            spec.delay.max if spec.delay.max is not None else spec.delay.min,
                        )
                    )
                    reading = self.reading(spec.entity_id)
                    reason = "missed" if missed else evaluate(spec, state, now, end, reading, delay)
                    if reason:
                        at = min(now, end) if reason in {"lux", "fallback"} else None
                        self.records[key] = {
                            "at": at.isoformat() if at else None,
                            "reason": reason,
                            "lux": reading,
                            "delay_seconds": delay,
                            "resolved_at": now.isoformat(),
                        }
                        self.qualifications.pop(key, None)
                        self.observed.discard(key)
                        resolved.append(at or now)
                        engine._record(f"lux:{key}", reason, f"{spec.entity_id}: {reading} lx")
                    else:
                        next_times.append(min(end, state.due) if state.due else end)
                if resolved:
                    # Save the winner before building executable actions. A failed
                    # write closes the engine's gate through its normal path.
                    if not await engine._persist():
                        return
                    await engine._ensure_plans(force=True)
                    if generation != engine.generation or not engine._effective_gate()[0]:
                        return
                    retained = [
                        event for event in engine._queue if event.kind not in {"plan", "boundary"}
                    ]
                    engine._queue_plans(since=min(resolved), preserve_pending=True)
                    queued = {event.key for event in engine._queue}
                    for event in retained:
                        if event.key not in queued:
                            heapq.heappush(engine._queue, event)
                    await engine._persist()
                    engine._arm_timer()
                if self.cancel_timer:
                    self.cancel_timer()
                    self.cancel_timer = None
                if next_times and generation == engine.generation and engine.active:

                    @callback
                    def due(_):
                        self.cancel_timer = None
                        if generation == engine.generation:
                            self.arm()

                    self.cancel_timer = async_track_point_in_utc_time(
                        engine.hass, due, max(now, min(next_times))
                    )
                engine._notify()
            except (ProgramError, ValueError) as err:
                engine._invalidate()
                engine.status, engine.reason = "error", f"Cannot resolve light-level timing: {err}"
                engine.last_error = str(err)
                engine._record("lux_planning", "failed", engine.reason)
                engine._schedule_planning_retry()
                await engine._persist()
                engine._notify()
            finally:
                self.pending_task = False
                if generation != engine.generation:
                    self.arm()

    def status(self):
        result = []
        now = dt_util.utcnow()
        for item in self.occurrences():
            key = f"{item['source_date']}:{item['source_id']}"
            state = self.qualifications.get(key)
            result.append(
                item
                | {
                    "status": "before_window"
                    if now < datetime.fromisoformat(item["start"])
                    else state.phase
                    if state
                    else "waiting_for_light",
                    "lux": self.reading(item["entity_id"]),
                    "since": state.since.isoformat() if state and state.since else None,
                    "due": state.due.isoformat() if state and state.due else None,
                }
            )
        return {"pending": result, "resolved": dict(self.records)}
