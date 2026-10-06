"""Durable UTC daily dispatch, projected handover, and explicit owned lifecycles."""

import asyncio
import heapq
import logging
import secrets
from collections import deque
from collections.abc import Callable
from copy import deepcopy
from dataclasses import dataclass, field, replace
from datetime import date, datetime, timedelta
from functools import partial
from types import SimpleNamespace

from homeassistant.const import (
    EVENT_CORE_CONFIG_UPDATE,
    EVENT_HOMEASSISTANT_STARTED,
    EVENT_HOMEASSISTANT_STOP,
)
from homeassistant.core import Context, State, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import (
    async_track_point_in_utc_time,
    async_track_state_change_event,
)
from homeassistant.util import dt as dt_util

from .actions import light_capabilities, light_matches, light_observation, observe, service_payload
from .activation import ActivationGate
from .activities import ActivityLifecycle
from .const import DOMAIN, SIGNAL_PREFIX
from .handover import calls_for_target
from .lighting import LightState, project_lighting
from .models import Activity, effective_handover, merge_defaults
from .planner import DailyPlan, PlanEvent, ResolvedAction, preview_dates
from .runtime_planning import MAX_EVENTS, MAX_INTERVALS, runtime_dates
from .storage import DurableStore, instant, plan_from_data, program_store
from .time_utils import PlanningContext, SimulationDay, simulation_date_at
from .validation import (
    ProgramError,
    RevisionConflict,
    behavior_hash,
    condition_data,
    program_data,
    resolve_targets,
)
from .validation import (
    program_revision as revision,
)

_LOGGER = logging.getLogger(__name__)
SERVICE_TIMEOUT = 10
DISPATCH_BATCH = 64
MAX_JOURNAL = 50000


@dataclass(order=True)
class RuntimeEvent:
    at: datetime
    order: tuple
    key: str = field(compare=False)
    kind: str = field(compare=False)
    payload: object = field(default=None, compare=False)
    attempt: int = field(default=0, compare=False)


class VirtualStates:
    def __init__(self, engine):
        self.engine = engine

    def get(self, entity):
        real = self.engine.hass.states.get(entity)
        if entity not in self.engine._virtual:
            return real
        value = self.engine._virtual[entity]
        return State(
            entity, value["state"], (dict(real.attributes) if real else {}) | value["attributes"]
        )


class DailyEngine:
    """Serialize bounded writes; invalidate new work immediately when the gate closes."""

    def __init__(self, hass, entry_id, program):
        self.hass, self.entry_id, self.program = hass, entry_id, program
        self.config = {"name": program.name}
        self.signal = f"{SIGNAL_PREFIX}_{entry_id}"
        self.gate = ActivationGate(hass, [condition_data(c) for c in program.activation.conditions])
        self.enabled = self.paused = self.dry_run = self.active = self.started = self.closed = False
        self.session = self.generation = 0
        self.status, self.reason = "disabled", "Permission is disabled"
        self.last_error = None
        self.outcomes = deque(maxlen=100)
        self._permission = DurableStore(
            hass, 1, f"{DOMAIN}.{entry_id}.permission", atomic_writes=True
        )
        self._store = DurableStore(hass, 1, f"{DOMAIN}.{entry_id}.runtime", atomic_writes=True)
        self._lock = asyncio.Lock()
        self._cancel_timer: Callable | None = None
        self._unsubs = []
        self._state_unsub = None
        self._contexts = deque(maxlen=1000)
        self._queue: list[RuntimeEvent] = []
        self._plans: dict[date, DailyPlan] = {}
        self._seed = secrets.token_hex(16)
        self._journal = {}
        self._activities: dict[str, ActivityLifecycle] = {}
        self._ownership_gates = {}
        self._ownership_observers = {}
        self._latest_intents = {}
        self._yielded = set()
        self._owned = {}
        self._leases = {}
        self._preexisting = set()
        self._handover = {}
        self._native_fades = set()
        self._virtual = {}
        self._restoring = False
        self._saved_context = None
        self._storage_failed = False

    @property
    def remote_owned(self):
        return any(
            any(e.startswith("remote.") for e in a.resources) for a in self._activities.values()
        )

    @property
    def next_event(self):
        return self._queue[0].at if self._queue else None

    @property
    def handover_deadline(self):
        return max((instant(v["deadline"]) for v in self._handover.values()), default=None)

    def _context(self):
        return PlanningContext(
            self.hass.config.time_zone,
            self.hass.config.latitude,
            self.hass.config.longitude,
            self.hass.config.elevation,
        )

    def _context_identity(self):
        context = self._context()
        location = self.program.location
        return [
            self.program.timezone
            if self.program.timezone != "home_assistant"
            else context.timezone,
            location.latitude if location else context.latitude,
            location.longitude if location else context.longitude,
            location.elevation if location else context.elevation,
        ]

    def _observe(self, entity):
        if self.dry_run and entity in self._virtual:
            return self._virtual[entity]
        return observe(self.hass, entity)

    def _lighting_source(self):
        return SimpleNamespace(states=VirtualStates(self)) if self.dry_run else self.hass

    async def async_prepare(self):
        await self.gate.async_prepare()
        permission = await self._permission.async_load() or {}
        self.enabled = permission.get("enabled", False)
        self.paused = permission.get("paused", False)
        self.dry_run = permission.get("dry_run", False)
        saved = await self._store.async_load() or {}
        self._seed = saved.get("seed", self._seed)
        self.session = saved.get("session", 0)
        self._restoring = saved.get("active", False) and saved.get("dry_run") == self.dry_run
        self._journal = saved.get("journal", {})
        self._saved_context = saved.get("context")
        self._contexts.extend(saved.get("contexts", []))
        if saved.get("dry_run") == self.dry_run:
            self._yielded = set(saved.get("yielded", []))
            self._owned = saved.get("owned", {})
            self._handover = saved.get("handover", {})
            self._native_fades = set(saved.get("native_fades", []))
            self._virtual = saved.get("virtual", {})
            self._leases = {key: set(value) for key, value in saved.get("leases", {}).items()}
            self._preexisting = set(saved.get("preexisting", []))
            for data in saved.get("activities", []):
                try:
                    lifecycle = ActivityLifecycle.from_dict(data)
                    if lifecycle.dry_run == self.dry_run:
                        self._activities[lifecycle.id] = lifecycle
                except (KeyError, TypeError, ValueError) as err:
                    self._record("recovery", "invalid_lifecycle", str(err))
        if (
            saved.get("behavior") == behavior_hash(self.program)
            and self._saved_context == self._context_identity()
        ):
            try:
                self._plans = {
                    p.simulation_date: p
                    for p in (plan_from_data(value) for value in saved.get("plans", []))
                }
            except (KeyError, TypeError, ValueError) as err:
                self._plans.clear()
                self._record("recovery", "invalid_plan", str(err))
        for key, item in self._journal.items():
            if item.get("status") == "pending":
                item["status"] = "uncertain"
                self._record(
                    key, "uncertain", "Dispatch interrupted; historical call is not replayed"
                )
        for entity, expected in list(self._owned.items()):
            if self._observe(entity) != expected:
                state = self.hass.states.get(entity)
                if (
                    entity in self._handover
                    and state
                    and (
                        state.context.id in self._contexts
                        or state.context.parent_id in self._contexts
                    )
                ):
                    self._owned[entity] = self._observe(entity)
                    continue
                self._owned.pop(entity)
                self._yielded.add(entity)

    async def async_start(self):
        self._listen_states()
        self._unsubs.append(
            self.hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, self._async_shutdown)
        )
        self._unsubs.append(
            self.hass.bus.async_listen(EVENT_CORE_CONFIG_UPDATE, self._config_changed)
        )
        if self.hass.is_running:
            self.started = True
            await self.async_reevaluate()
        else:
            self.status, self.reason = "waiting", "Waiting for Home Assistant startup"
            self._unsubs.append(
                self.hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, self._async_started)
            )
        self._notify()

    def _listen_states(self):
        if self._state_unsub:
            self._state_unsub()
        entities = set(self.gate.entities)
        self._ownership_observers.clear()

        def observe_conditions(conditions):
            gate = ActivationGate(self.hass, conditions)
            entities.update(gate.entities)
            for entity, attribute in gate.attributes:
                self._ownership_observers.setdefault(entity, set()).add(attribute)

        for routine in self.program.routines:
            for item in (*routine.steps, *routine.activities):
                actions = (
                    item.actions if hasattr(item, "actions") else (*item.on_start, *item.on_end)
                )
                for action in actions:
                    entities.update(resolve_targets(self.program, action.targets))
                    entities.update(action.resources)
                if isinstance(item, Activity):
                    entities.update(item.resources)
                    observe_conditions([condition_data(c) for c in item.start_conditions])
                    observe_conditions([condition_data(c) for c in item.ownership_conditions])
            for window in routine.activity_windows:
                entities.update(resolve_targets(self.program, window.targets))
        entities.update(resolve_targets(self.program, self.program.lighting.managed_targets))
        for lifecycle in self._activities.values():
            entities.update(lifecycle.resources)
            observe_conditions(lifecycle.ownership_conditions)
        self._state_unsub = async_track_state_change_event(self.hass, entities, self._state_changed)

    async def _async_started(self, _):
        self.started = True
        await self.async_reevaluate()

    async def _async_shutdown(self, _):
        await self.async_close(cleanup=False)

    @callback
    def _config_changed(self, _):
        if self._saved_context != self._context_identity():
            self._invalidate()
            self.hass.async_create_task(self._async_reconfigure())

    async def _async_reconfigure(self):
        async with self._lock:
            await self._cancel_native_fades()
            self._plans.clear()
            self._restoring = True
            await self._reevaluate_locked()

    def _effective_gate(self):
        if self._storage_failed:
            return False, "Runtime persistence failed; reload or enable to retry"
        if self.closed or not self.started or not self.enabled or self.paused:
            return False, (
                "Integration unloaded"
                if self.closed
                else "Waiting for Home Assistant startup"
                if not self.started
                else "Permission is disabled"
                if not self.enabled
                else "Simulation is paused"
            )
        return self.gate.evaluate()

    @callback
    def _state_changed(self, event):
        entity = event.data["entity_id"]
        if entity in self.gate.entities:
            if not self._effective_gate()[0]:
                self._invalidate()
            self.hass.async_create_task(self.async_reevaluate())
        if event.context.id in self._contexts or event.context.parent_id in self._contexts:
            if entity in self._owned and (value := self._observe(entity)):
                self._owned[entity] = value
            for lifecycle in self._activities.values():
                if entity in lifecycle.acquired:
                    lifecycle.observed[entity] = self._observe(entity)
            return
        old, new = event.data.get("old_state"), event.data.get("new_state")
        if old is not None and new is not None and old.state == new.state:
            watched = {
                "brightness",
                "color_temp_kelvin",
                "hs_color",
                "rgb_color",
                "current_activity",
                "media_content_id",
                "source",
            } | self._ownership_observers.get(entity, set())
            if all(old.attributes.get(key) == new.attributes.get(key) for key in watched):
                return
        if not self.active and not self._activities:
            return
        if self.dry_run:
            return
        if self.program.policies.manual_override == "yield_entity_until_next_activation":
            self._yielded.add(entity)
            self._owned.pop(entity, None)
            self._leases.pop(entity, None)
            self._handover.pop(entity, None)
        for key, lifecycle in list(self._activities.items()):
            dependencies = ActivationGate(self.hass, lifecycle.ownership_conditions).entities
            if entity in lifecycle.resources or entity in dependencies:
                self._activities.pop(key)
                self._record(key, "yielded", f"Outside control of {entity}; end suppressed")
        self.hass.async_create_task(self._async_observation_changed(entity))

    async def _async_observation_changed(self, entity):
        async with self._lock:
            await self._cancel_native_fades({entity})
            await self._persist()
            self._notify()

    @callback
    def _invalidate(self):
        self.active = False
        self.generation += 1
        self._queue.clear()
        if self._cancel_timer:
            self._cancel_timer()
            self._cancel_timer = None

    async def _persist(self):
        self._ownership_gates = {
            key: gate for key, gate in self._ownership_gates.items() if key in self._activities
        }
        if len(self._journal) > MAX_JOURNAL:
            protected = {key for a in self._activities.values() for key in a.pending_starts}
            protected.update(
                f"{a.id}:end:{index}"
                for a in self._activities.values()
                for index in range(len(a.end_actions))
            )
            candidates = sorted(
                (value.get("time", ""), key)
                for key, value in self._journal.items()
                if key not in protected
                and (
                    value.get("status") == "historical_skipped"
                    or (
                        value.get("time")
                        and instant(value["time"]) < dt_util.utcnow()
                        and value.get("status") not in {"pending", "uncertain"}
                    )
                )
            )
            for _, key in candidates[: len(self._journal) - MAX_JOURNAL]:
                self._journal.pop(key)
        snapshot = {
            "seed": self._seed,
            "session": self.session,
            "active": self.active,
            "dry_run": self.dry_run,
            "behavior": behavior_hash(self.program),
            "context": self._context_identity(),
            "plans": [p.to_dict() for p in self._plans.values()],
            "journal": self._journal,
            "activities": [a.to_dict() for a in self._activities.values()],
            "yielded": sorted(self._yielded),
            "owned": self._owned,
            "leases": {key: sorted(value) for key, value in self._leases.items()},
            "preexisting": sorted(self._preexisting),
            "handover": self._handover,
            "native_fades": sorted(self._native_fades),
            "contexts": list(self._contexts),
            "virtual": self._virtual,
        }
        try:
            if len(self._journal) > MAX_JOURNAL:
                raise HomeAssistantError("Execution journal exceeds its bounded runtime limit")
            await self._store.async_save(deepcopy(snapshot))
        except HomeAssistantError as err:
            self._storage_failed = True
            self._invalidate()
            self.status, self.reason = "inactive", "Runtime persistence failed"
            self.last_error = str(err)
            self._record("storage", "failed", str(err))
            return False
        return True

    async def _save_permission(self):
        await self._permission.async_save(
            {"enabled": self.enabled, "paused": self.paused, "dry_run": self.dry_run}
        )

    async def async_set_enabled(self, enabled):
        self._storage_failed = False
        self.enabled = enabled
        if not enabled:
            self._invalidate()
        async with self._lock:
            await self._save_permission()
            await self._reevaluate_locked()

    async def async_set_paused(self, paused):
        if not paused:
            self._storage_failed = False
        self.paused = paused
        if paused:
            self._invalidate()
        async with self._lock:
            await self._save_permission()
            await self._reevaluate_locked()

    async def async_set_dry_run(self, dry_run):
        if self.dry_run == dry_run:
            return
        self._invalidate()
        async with self._lock:
            await self._stop_owned()
            self._handover.clear()
            self._owned.clear()
            self._leases.clear()
            self._yielded.clear()
            self._virtual.clear()
            self._preexisting.clear()
            self.dry_run = dry_run
            self._restoring = False
            await self._save_permission()
            await self._reevaluate_locked()

    async def async_reevaluate(self):
        async with self._lock:
            await self._reevaluate_locked()

    async def _reevaluate_locked(self):
        passed, reason = self._effective_gate()
        if not passed:
            self._invalidate()
            if self.started and not self.closed:
                await self._stop_owned()
            self.status = (
                "disabled"
                if not self.enabled
                else "paused"
                if self.paused
                else ("waiting" if not self.started or "unresolved" in reason else "inactive")
            )
            self.reason = reason
            self._restoring = False
        elif not self.active:
            self.active = True
            self.generation += 1
            if not self._restoring:
                self.session += 1
                self._yielded.clear()
                self._preexisting.clear()
                self._leases.clear()
            try:
                await self._ensure_plans()
                await self._recover_activities()
                self._queue_plans()
                await self._begin_handover(recover=self._restoring)
                self._restoring = False
                self.status = "transitioning" if self._handover else "active"
                self.reason = (
                    "Converging projected lighting" if self._handover else "Daily simulation"
                )
                self._arm_timer()
            except (ProgramError, ValueError) as err:
                self._invalidate()
                self.status, self.reason = "inactive", f"Cannot compile daily plan: {err}"
                self.last_error = str(err)
        await self._persist()
        self._notify()

    async def _ensure_plans(self, *, force=False):
        today = simulation_date_at(self.program, dt_util.utcnow(), self._context())
        dates = runtime_dates(self.program, today)
        if force or self._saved_context != self._context_identity():
            self._plans.clear()
        missing = [day for day in dates if day not in self._plans]
        if missing:
            plans = await self.hass.async_add_executor_job(
                partial(preview_dates, self.program, missing, self._seed, context=self._context())
            )
            for plan in plans:
                if (
                    not plan.feasible
                    or len(plan.events) > MAX_EVENTS
                    or len(plan.intervals) > MAX_INTERVALS
                ):
                    raise ValueError(f"Infeasible or oversized plan for {plan.simulation_date}")
                self._plans[plan.simulation_date] = plan
        self._plans = {
            day: plan
            for day, plan in self._plans.items()
            if day in dates or any(e.at >= dt_util.utcnow() for e in plan.events)
        }
        self._saved_context = self._context_identity()
        cutoff = (today - timedelta(days=2)).isoformat()
        self._journal = {
            key: value
            for key, value in self._journal.items()
            if value.get("date", today.isoformat()) >= cutoff
        }
        if len(self._journal) > MAX_JOURNAL:
            raise ValueError("Execution journal exceeds the bounded runtime limit")
        await self._persist()

    def _plan_at(self, at):
        day = simulation_date_at(self.program, at, self._context())
        return self._plans[day]

    def _projection_plan(self, at):
        current = self._plan_at(at)
        events = []
        for plan in self._plans.values():
            if plan.simulation_date != current.simulation_date:
                spanning = {
                    i.id
                    for i in plan.intervals
                    if i.kind == "window" and i.start < current.end and i.end > current.start
                }
                events.extend(
                    replace(e, lease_id=f"{plan.simulation_date}:{e.lease_id}")
                    for e in plan.events
                    if e.lease_id in spanning
                )
                events.extend(
                    e for e in plan.events if not e.lease_id and current.start <= e.at < current.end
                )
        events.extend(
            replace(e, lease_id=f"{current.simulation_date}:{e.lease_id}") if e.lease_id else e
            for e in current.events
        )
        return replace(current, events=tuple(sorted(events, key=lambda e: e.order_key)))

    async def _ensure_projection_date(self, at):
        day = simulation_date_at(self.program, at, self._context())
        if day not in self._plans:
            plans = await self.hass.async_add_executor_job(
                partial(preview_dates, self.program, [day], self._seed, context=self._context())
            )
            if not plans[0].feasible:
                raise ValueError(f"Infeasible handover endpoint plan for {day}")
            self._plans[day] = plans[0]

    def _key(self, plan, event):
        return f"{'dry' if self.dry_run else 'live'}:{plan.behavior_hash}:{event.id}"

    def _push(self, at, kind, key, payload=None, order=(20, 1, "", 0), attempt=0):
        heapq.heappush(self._queue, RuntimeEvent(at, order + (key,), key, kind, payload, attempt))

    def _queue_plans(self):
        now = dt_util.utcnow()
        self._queue.clear()
        current = self._plan_at(now)
        for plan in self._plans.values():
            for interval in plan.intervals:
                if interval.kind == "window" and interval.start < now < interval.end:
                    for entity in interval.resources:
                        leases = self._leases.setdefault(entity, set())
                        leases.add(f"{plan.simulation_date}:{interval.id}")
                        value = self._observe(entity)
                        if value and value["state"] == "on" and entity not in self._owned:
                            self._preexisting.add(entity)
            for event in plan.events:
                key = self._key(plan, event)
                if key in self._journal or event.kind == "activity_end":
                    continue
                if event.at < now:
                    self._journal[key] = {
                        "status": "historical_skipped",
                        "date": plan.simulation_date.isoformat(),
                    }
                elif event.at < current.end:
                    self._push(event.at, "plan", key, (plan, event), event.order_key[1:])
        self._push(current.end, "boundary", f"boundary:{current.end}", order=(0, 0, "", 0))
        self._queue_activity_ends()

    def _queue_activity_ends(self):
        now = dt_util.utcnow()
        queued = {e.key for e in self._queue if e.kind in {"cleanup", "confirm"}}
        for lifecycle in self._activities.values():
            if lifecycle.phase == "confirming" and f"{lifecycle.id}:confirm" not in queued:
                self._push(
                    now + timedelta(seconds=1), "confirm", f"{lifecycle.id}:confirm", lifecycle.id
                )
            if lifecycle.deadline and lifecycle.phase in {"running", "ending"}:
                for index, (offset, _) in enumerate(lifecycle.end_actions):
                    key = f"{lifecycle.id}:end:{index}"
                    if index not in lifecycle.completed_ends and key not in queued:
                        self._push(
                            max(now, lifecycle.deadline + timedelta(seconds=offset)),
                            "cleanup",
                            key,
                            (lifecycle.id, index),
                            order=(20, 0, lifecycle.source_id, index),
                        )

    async def _begin_handover(self, *, recover=False):
        now = dt_util.utcnow()
        old = self._handover if recover else {}
        self._handover = {}
        observed = {
            entity: light_observation(self._lighting_source(), entity)
            for entity in resolve_targets(self.program, self.program.lighting.managed_targets)
        }
        managed = project_lighting(
            self.program, self._projection_plan(now), now, yielded=frozenset(self._yielded)
        )
        for entity in managed:
            config = effective_handover(self.program)
            memberships = [
                effective_handover(self.program, group)
                for group in self.program.groups
                if group.id in self.program.lighting.managed_targets.groups
                and entity in group.entities
            ]
            if entity in self.program.lighting.managed_targets.entities:
                memberships.append(config)
            if memberships:
                config = max(memberships, key=lambda value: value.duration)
            previous = old.get(entity)
            deadline = (
                instant(previous["deadline"])
                if previous
                else (now + timedelta(seconds=config.duration))
            )
            if deadline <= now and previous:
                deadline = now + timedelta(seconds=config.duration)
            try:
                await self._ensure_projection_date(deadline)
                plan = self._projection_plan(deadline)
            except KeyError:
                self._record(entity, "handover_skipped", "Deadline exceeds loaded plan horizon")
                continue
            target = project_lighting(
                self.program, plan, deadline, yielded=frozenset(self._yielded)
            ).get(entity)
            current = observed[entity]
            if current is None or target is None:
                self._record(entity, "handover_skipped", "Managed target is unavailable")
                continue
            if light_matches(self._lighting_source(), entity, target):
                if previous and entity in self._native_fades and deadline > now:
                    self._handover[entity] = previous
                    self._push(
                        deadline,
                        "handover_done",
                        f"handover:restored:{entity}:{deadline}:done",
                        entity,
                        order=(6, 0, entity, 0),
                    )
                continue
            dimmable, native = light_capabilities(self.hass, entity)
            calls = calls_for_target(
                entity,
                current,
                target,
                now,
                deadline,
                config,
                dimmable=dimmable,
                native_transition=native,
            )
            if not calls:
                continue
            token = secrets.token_hex(8)
            self._handover[entity] = {
                "start": now.isoformat(),
                "deadline": deadline.isoformat(),
                "observed": current.to_dict(),
                "target": target.to_dict(),
            }
            for index, call in enumerate(calls):
                action = ResolvedAction(
                    f"light.{call.service}", (entity,), call.data, (entity,), True
                )
                self._push(
                    call.at,
                    "handover",
                    f"handover:{token}:{entity}:{index}",
                    (entity, action, call.native),
                    order=(5, 1, entity, index),
                )
            self._push(
                deadline,
                "handover_done",
                f"handover:{token}:{entity}:done",
                entity,
                order=(6, 0, entity, 0),
            )
        await self._persist()

    @callback
    def _arm_timer(self):
        if self._cancel_timer:
            self._cancel_timer()
            self._cancel_timer = None
        if self.closed or not self._queue or not self.active:
            return
        generation = self.generation

        @callback
        def due(_):
            self._cancel_timer = None
            if generation == self.generation:
                self.hass.async_create_task(self._async_dispatch(generation))

        self._cancel_timer = async_track_point_in_utc_time(
            self.hass, due, max(dt_util.utcnow(), self._queue[0].at)
        )

    async def _async_dispatch(self, generation):
        async with self._lock:
            for _ in range(DISPATCH_BATCH):
                if generation != self.generation or not self._effective_gate()[0]:
                    await self._reevaluate_locked()
                    return
                if not self._queue or self._queue[0].at > dt_util.utcnow():
                    break
                event = heapq.heappop(self._queue)
                if event.kind == "boundary":
                    try:
                        await self._ensure_plans()
                        self._queue_plans()
                        await self._begin_handover()
                    except (ProgramError, ValueError) as err:
                        self._invalidate()
                        await self._stop_owned()
                        self.status, self.reason = "inactive", f"Cannot compile daily plan: {err}"
                        self.last_error = str(err)
                elif event.kind == "cleanup":
                    key, index = event.payload
                    if lifecycle := self._activities.get(key):
                        await self._end_action(lifecycle, index)
                elif event.kind == "confirm":
                    if lifecycle := self._activities.get(event.payload):
                        if await self._confirm_owned(lifecycle):
                            lifecycle.phase = "running"
                            self._queue_activity_ends()
                        elif event.attempt < 2 and lifecycle.deadline > dt_util.utcnow():
                            self._push(
                                dt_util.utcnow() + timedelta(seconds=1),
                                "confirm",
                                event.key,
                                lifecycle.id,
                                attempt=event.attempt + 1,
                            )
                        else:
                            self._activities.pop(lifecycle.id, None)
                            self._record(
                                lifecycle.id,
                                "unconfirmed_start",
                                "Successful dispatch had no bounded ownership confirmation",
                            )
                elif event.kind == "handover_done":
                    if data := self._handover.get(event.payload):
                        target = LightState(**data["target"])
                        if event.payload not in self._yielded and not light_matches(
                            self._lighting_source(), event.payload, target
                        ):
                            payload = target.to_dict()
                            payload.pop("state")
                            if target.state == "off":
                                payload = {}
                            action = ResolvedAction(
                                f"light.turn_{target.state}",
                                (event.payload,),
                                payload,
                                (event.payload,),
                                True,
                            )
                            await self._call(action, event.key, generation)
                    self._handover.pop(event.payload, None)
                    self._native_fades.discard(event.payload)
                elif event.kind == "handover":
                    entity, action, native = event.payload
                    if entity in self._handover and entity not in self._yielded:
                        if await self._call(action, event.key, generation, retry=event.attempt):
                            if native:
                                self._native_fades.add(entity)
                elif event.kind == "retry":
                    action = event.payload
                    if any(
                        self._latest_intents.get(entity) != event.key for entity in action.resources
                    ):
                        self._finish(event.key, "superseded_retry")
                    elif not set(action.targets) & self._yielded:
                        await self._call(action, event.key, generation, retry=event.attempt)
                else:
                    plan, planned = event.payload
                    await self._execute_plan(plan, planned, event.key, generation)
            await self._persist()
            if self.active:
                self.status = "transitioning" if self._handover else "active"
                self.reason = (
                    "Converging projected lighting" if self._handover else "Daily simulation"
                )
            self._arm_timer()
            self._notify()

    async def _call(
        self, action, key, generation, *, retry=0, cleanup=False, allow_retry=True, owner=None
    ):
        previous = self._journal.get(key, {}).get("status")
        if previous in {"dispatched", "would_dispatch"}:
            return True
        if previous in {"uncertain", "historical_skipped"}:
            return False
        if not cleanup and (generation != self.generation or not self._effective_gate()[0]):
            return False
        if (set(action.targets) | set(action.resources)) & self._yielded:
            return False
        if any(self._observe(entity) is None for entity in action.targets):
            self._finish(key, "unavailable", action)
            return False
        domain, service = action.action.split(".")
        data = service_payload(self.hass, action)
        if not self.hass.services.has_service(domain, service):
            self._finish(key, "service_missing", action)
            return False
        context = Context()
        self._contexts.append(context.id)
        for entity in action.resources:
            self._latest_intents[entity] = key
        self._journal[key] = {
            "status": "pending",
            "date": dt_util.utcnow().date().isoformat(),
            "context": context.id,
            "intended": action.to_dict(),
            "revision": revision(self.program),
        }
        if not await self._persist():
            return False
        # Storage yields to state listeners; check permission/ownership again at dispatch.
        if (
            (not cleanup and (generation != self.generation or not self._effective_gate()[0]))
            or (set(action.targets) | set(action.resources)) & self._yielded
            or (owner is not None and owner not in self._activities)
        ):
            self._finish(key, "cancelled_before_dispatch", action)
            await self._persist()
            return False
        if self.dry_run:
            self._simulate(action, data)
            for entity in action.targets:
                if entity.startswith(("light.", "switch.")):
                    self._owned[entity] = self._observe(entity)
            self._finish(key, "would_dispatch", action)
            await self._persist()
            return True
        try:
            async with asyncio.timeout(SERVICE_TIMEOUT):
                await self.hass.services.async_call(
                    domain, service, data, blocking=True, context=context
                )
        except Exception as err:
            self.last_error = f"{action.action}: {err}"
            self._finish(key, "failed", action, self.last_error)
            if (
                action.replay_safe
                and allow_retry
                and not retry
                and not cleanup
                and self._effective_gate()[0]
            ):
                self._push(dt_util.utcnow() + timedelta(seconds=1), "retry", key, action, attempt=1)
            return False
        for entity in action.targets:
            if entity.startswith(("light.", "switch.")) and entity not in self._yielded:
                if value := self._observe(entity):
                    self._owned[entity] = value
        self._finish(key, "dispatched", action)
        await self._persist()
        return True

    def _simulate(self, action, data):
        for entity in action.targets:
            before = self._observe(entity) or {"state": "off", "attributes": {}}
            attrs = dict(before["attributes"])
            if action.action.endswith(".turn_on"):
                attrs.update(
                    {
                        key: data[key]
                        for key in ("brightness", "color_temp_kelvin", "hs_color", "rgb_color")
                        if key in data
                    }
                )
                if "brightness_pct" in data:
                    attrs["brightness"] = round(data["brightness_pct"] * 255 / 100)
                if "activity" in data:
                    attrs["current_activity"] = data["activity"]
                self._virtual[entity] = {"state": "on", "attributes": attrs}
            elif action.action.endswith(".turn_off"):
                self._virtual[entity] = {"state": "off", "attributes": attrs}

    def _finish(self, key, outcome, action=None, detail=""):
        entry = self._journal.setdefault(key, {"date": dt_util.utcnow().date().isoformat()})
        entry.update(status=outcome, time=dt_util.utcnow().isoformat())
        if action:
            entry["observed"] = {
                entity: self._observe(entity)
                for entity in set(action.resources) | set(action.targets)
            }
        self._record(key, outcome, detail or (action.action if action else ""))

    async def _execute_plan(self, plan, event: PlanEvent, key, generation):
        action = event.action
        if set(action.targets) & self._yielded:
            self._finish(key, "yielded")
            return
        if not action.action.startswith(("light.", "switch.")):
            conflicts = (set(action.resources) | set(action.targets)) & self._handover.keys()
            if conflicts:
                at = max(instant(self._handover[entity]["deadline"]) for entity in conflicts)
                self._push(at, "plan", key, (plan, event), event.order_key[1:])
                self._record(key, "deferred_handover", "Declared resources are still converging")
                return
        if event.kind == "activity_start":
            await self._start_activity(plan, event, key, generation)
            return
        targets = action.targets
        if event.kind.startswith("window_"):
            interval = next(item for item in plan.intervals if item.id == event.lease_id)
            entity = targets[0]
            lease_id = f"{plan.simulation_date}:{event.lease_id}"
            leases = self._leases.setdefault(entity, set())
            if event.kind == "window_start":
                if interval.end <= dt_util.utcnow():
                    self._finish(key, "expired_interval")
                    return
                if not leases and self._observe(entity) and self._observe(entity)["state"] == "on":
                    if entity not in self._owned:
                        self._preexisting.add(entity)
                leases.add(lease_id)
            else:
                if lease_id not in leases:
                    self._finish(key, "unowned_end")
                    return
                leases.discard(lease_id)
                if leases or entity in self._preexisting:
                    self._finish(key, "lease_retained")
                    return
                if entity not in self._owned:
                    self._finish(key, "unowned_end")
                    return
            prior = [
                item
                for item in plan.events
                if item.at <= event.at
                and entity in item.action.targets
                and item.kind == "step"
                and item.action.action
                in {"light.turn_on", "light.turn_off", "switch.turn_on", "switch.turn_off"}
            ]
            if prior:
                self._finish(key, "routine_priority")
                return
        if any(entity in self._handover for entity in targets) and action.action.startswith(
            "light."
        ):
            self._finish(key, "subsumed_handover")
            return
        # A safety intent remains authoritative through this simulation day.
        if event.priority != 30 and any(
            prior.priority == 30
            and prior.at <= event.at
            and set(prior.action.targets) & set(targets)
            for prior in plan.events
        ):
            self._finish(key, "safety_priority")
            return
        await self._call(action, key, generation)

    async def _start_activity(self, plan, event, key, generation):
        activity_id = (
            f"{'dry' if self.dry_run else 'live'}:{plan.behavior_hash}:"
            f"{plan.simulation_date}:activity:{event.source_id}"
        )
        lifecycle = self._activities.get(activity_id)
        if lifecycle is None:
            routine, item = next(
                (r, a)
                for r in self.program.routines
                for a in r.activities
                if a.id == event.source_id
            )
            interval = next(
                i for i in plan.intervals if i.source_id == item.id and i.kind == "activity"
            )
            if interval.end <= dt_util.utcnow() or any(
                set(item.resources) & set(a.resources) for a in self._activities.values()
            ):
                self._finish(key, "activity_unavailable")
                return
            gate = ActivationGate(self.hass, [condition_data(c) for c in item.start_conditions])
            await gate.async_prepare()
            if not gate.evaluate(VirtualStates(self) if self.dry_run else None)[0] or any(
                self._observe(e) is None or e in self._yielded for e in item.resources
            ):
                self._finish(key, "start_condition_failed")
                return
            if not item.start_conditions and any(
                e.startswith(("remote.", "media_player."))
                and self._observe(e)["state"] not in {"off", "idle", "standby"}
                for e in item.resources
            ):
                self._finish(key, "already_in_use")
                return
            ends = [p for p in plan.events if p.source_id == item.id and p.kind == "activity_end"]
            starts = {
                self._key(plan, p)
                for p in plan.events
                if p.source_id == item.id and p.kind == "activity_start"
            }
            lifecycle = ActivityLifecycle(
                activity_id,
                item.id,
                tuple(item.resources),
                interval.duration,
                tuple(((p.at - interval.end).total_seconds(), p.action) for p in ends),
                [condition_data(c) for c in item.ownership_conditions],
                item.stop_behavior
                or merge_defaults(self.program, routine).activities.stop_behavior,
                starts,
                dry_run=self.dry_run,
            )
            self._activities[activity_id] = lifecycle
            await self._persist()
        if await self._call(event.action, key, generation, allow_retry=False):
            lifecycle.contexts.update(self._contexts)
            lifecycle.acquired.update(set(event.action.resources) & set(lifecycle.resources))
            for entity in event.action.targets:
                if entity in lifecycle.acquired and event.action.action.endswith(
                    (".turn_on", ".turn_off")
                ):
                    expected = {
                        "state": "on" if event.action.action.endswith(".turn_on") else "off"
                    }
                    if "activity" in event.action.data:
                        expected["current_activity"] = event.action.data["activity"]
                    lifecycle.desired_states[entity] = expected
            lifecycle.observed = {e: self._observe(e) for e in lifecycle.acquired}
            lifecycle.pending_starts.discard(key)
            if not lifecycle.pending_starts:
                lifecycle.phase = "running"
                lifecycle.deadline = dt_util.utcnow() + timedelta(seconds=lifecycle.duration)
                routine, item = next(
                    (r, a)
                    for r in self.program.routines
                    for a in r.activities
                    if a.id == event.source_id
                )
                day = SimulationDay(self.program, plan.simulation_date, self._context(), [])
                limit = day.end if not item.allow_cross_boundary else None
                if item.within:
                    bounds = day.between(item.within, plan.step_times, ())
                    limit = bounds[1] if bounds else dt_util.utcnow()
                cleanup_end = lifecycle.deadline + timedelta(
                    seconds=max(offset for offset, _ in lifecycle.end_actions)
                )
                if limit and cleanup_end > limit:
                    self._record(
                        key, "deadline_constraint", "Late startup no longer fits its window"
                    )
                    await self._cancel_activity(lifecycle)
                    return
                if await self._confirm_owned(lifecycle):
                    self._queue_activity_ends()
                else:
                    lifecycle.phase = "confirming"
                    self._push(
                        dt_util.utcnow() + timedelta(seconds=1),
                        "confirm",
                        f"{lifecycle.id}:confirm",
                        lifecycle.id,
                    )
            await self._persist()
            if generation != self.generation or not self._effective_gate()[0]:
                await self._cancel_activity(lifecycle)
        else:
            await self._cancel_activity(lifecycle)

    async def _confirm_owned(self, lifecycle):
        if any(e in self._yielded for e in lifecycle.resources) or not lifecycle.observed:
            return False
        if any(
            self._observe(e) != expected or expected is None
            for e, expected in lifecycle.observed.items()
        ):
            return False
        if lifecycle.phase != "ending":
            for entity, expected in lifecycle.desired_states.items():
                value = self._observe(entity)
                if value is None or value["state"] != expected["state"]:
                    return False
                if (
                    "current_activity" in expected
                    and value["attributes"].get("current_activity") != expected["current_activity"]
                ):
                    return False
        if lifecycle.phase != "ending":
            gate = self._ownership_gates.get(lifecycle.id)
            if gate is None:
                gate = ActivationGate(self.hass, lifecycle.ownership_conditions)
                await gate.async_prepare()
                self._ownership_gates[lifecycle.id] = gate
            return (
                lifecycle.id in self._activities
                and gate.evaluate(VirtualStates(self) if self.dry_run else None)[0]
            )
        return True

    async def _end_action(self, lifecycle, index):
        if index in lifecycle.completed_ends or lifecycle.id not in self._activities:
            return
        key = f"{lifecycle.id}:end:{index}"
        if self._journal.get(key, {}).get("status") == "uncertain":
            self._activities.pop(lifecycle.id, None)
            self._record(key, "uncertain_cleanup", "Opaque end dispatch is not repeated")
            return
        if not await self._confirm_owned(lifecycle):
            self._activities.pop(lifecycle.id, None)
            self._record(key, "ownership_lost", "End suppressed without matching observations")
            return
        lifecycle.phase = "ending"
        await self._persist()
        action = lifecycle.end_actions[index][1]
        unacquired = (set(action.resources) & set(lifecycle.resources)) - lifecycle.acquired
        if unacquired - set(action.targets):
            # Opaque effects cannot be split into a safe partial rollback.
            lifecycle.completed_ends.add(index)
            self._finish(key, "unacquired_resource")
            if len(lifecycle.completed_ends) == len(lifecycle.end_actions):
                self._activities.pop(lifecycle.id, None)
            await self._persist()
            return
        targets = tuple(
            e for e in action.targets if e not in lifecycle.resources or e in lifecycle.acquired
        )
        if action.targets and not targets:
            success = True
            self._finish(key, "unacquired_resource")
        else:
            action = replace(
                action,
                targets=targets,
                resources=tuple(e for e in action.resources if e not in unacquired),
            )
            success = await self._call(action, key, None, cleanup=True, owner=lifecycle.id)
        lifecycle.completed_ends.add(index)
        lifecycle.observed = {e: self._observe(e) for e in lifecycle.acquired}
        if not success or len(lifecycle.completed_ends) == len(lifecycle.end_actions):
            self._activities.pop(lifecycle.id, None)
        await self._persist()

    async def _cancel_activity(self, lifecycle):
        if lifecycle.stop_behavior == "end_if_owned":
            for index in range(len(lifecycle.end_actions)):
                await self._end_action(lifecycle, index)
        else:
            self._activities.pop(lifecycle.id, None)
            self._record(lifecycle.id, "left_running", "Explicit stop policy releases ownership")

    async def _recover_activities(self):
        for lifecycle in list(self._activities.values()):
            if lifecycle.phase == "ending":
                for index in range(len(lifecycle.end_actions)):
                    saved = self._journal.get(f"{lifecycle.id}:end:{index}", {})
                    if saved.get("status") in {"dispatched", "would_dispatch"}:
                        lifecycle.completed_ends.add(index)
                        lifecycle.observed.update(
                            {
                                e: value
                                for e, value in saved.get("observed", {}).items()
                                if e in lifecycle.acquired
                            }
                        )
                if len(lifecycle.completed_ends) == len(lifecycle.end_actions):
                    self._activities.pop(lifecycle.id)
                    continue
            if lifecycle.phase == "starting":
                for key in tuple(lifecycle.pending_starts):
                    saved = self._journal.get(key, {})
                    if saved.get("status") in {"dispatched", "would_dispatch"}:
                        action = saved.get("intended", {})
                        resources = set(action.get("resources", ())) & set(lifecycle.resources)
                        lifecycle.acquired.update(resources)
                        lifecycle.observed.update({e: saved["observed"].get(e) for e in resources})
                        lifecycle.pending_starts.discard(key)
                await self._cancel_activity(lifecycle)
            elif lifecycle.phase == "confirming" and lifecycle.deadline > dt_util.utcnow():
                self._push(
                    dt_util.utcnow() + timedelta(seconds=1),
                    "confirm",
                    f"{lifecycle.id}:confirm",
                    lifecycle.id,
                )
            elif not await self._confirm_owned(lifecycle):
                self._activities.pop(lifecycle.id, None)
                self._record(
                    lifecycle.id, "ownership_lost", "Saved activity no longer matches observations"
                )
            elif lifecycle.deadline and lifecycle.deadline <= dt_util.utcnow():
                for index, (offset, _) in enumerate(lifecycle.end_actions):
                    if lifecycle.deadline + timedelta(seconds=offset) <= dt_util.utcnow():
                        await self._end_action(lifecycle, index)

    async def _cancel_native_fades(self, entities=None):
        for entity in set(self._native_fades):
            if entities is not None and entity not in entities:
                continue
            self._native_fades.discard(entity)
            if entity in self._yielded or entity not in self._owned:
                continue
            current = light_observation(self.hass, entity)
            if current is None or self.dry_run:
                continue
            data = {"transition": 0}
            if current.state == "on":
                data["brightness"] = max(1, round(current.brightness_pct * 255 / 100))
            action = ResolvedAction(f"light.turn_{current.state}", (entity,), data, (entity,), True)
            # Hold only the simulator's still-owned transition at its observed level.
            await self._call(
                action,
                f"cancel_fade:{self.session}:{entity}:{secrets.token_hex(4)}",
                None,
                cleanup=True,
            )

    async def _stop_owned(self):
        await self._cancel_native_fades()
        self._handover.clear()
        for lifecycle in list(self._activities.values()):
            await self._cancel_activity(lifecycle)
        if self.program.policies.lighting_stop_behavior == "turn_off_owned":
            for entity, expected in list(self._owned.items()):
                if (
                    entity not in self._yielded
                    and entity not in self._preexisting
                    and self._observe(entity) == expected
                ):
                    action = ResolvedAction(
                        f"{entity.split('.')[0]}.turn_off", (entity,), {}, (entity,), True
                    )
                    await self._call(action, f"stop:{self.session}:{entity}", None, cleanup=True)
        self._owned.clear()

    async def async_replace_program(self, program, *, expected_revision=None):
        gate = ActivationGate(self.hass, [condition_data(c) for c in program.activation.conditions])
        await gate.async_prepare()
        today = simulation_date_at(program, dt_util.utcnow(), self._context())
        plans = await self.hass.async_add_executor_job(
            partial(
                preview_dates,
                program,
                runtime_dates(program, today),
                self._seed,
                context=self._context(),
            )
        )
        if any(not plan.feasible for plan in plans):
            raise ProgramError(
                [issue for plan in plans for issue in plan.issues if issue.severity == "error"]
            )
        async with self._lock:
            if self.closed:
                raise HomeAssistantError("Occupied is unloaded; refresh before saving")
            if expected_revision is not None and expected_revision != revision(self.program):
                raise RevisionConflict(
                    "The program changed. Reload the saved program before saving."
                )
            await program_store(self.hass, self.entry_id).async_save(program_data(program))
            if behavior_hash(program) == behavior_hash(self.program):
                self.program = program
                self.config["name"] = program.name
                await self._persist()
                self._notify()
                return
            self._invalidate()
            await self._cancel_native_fades()
            self.program, self.gate = program, gate
            self.config["name"] = program.name
            self._plans.clear()
            self._handover.clear()
            self._restoring = True
            self._listen_states()
            await self._reevaluate_locked()

    def _record(self, key, outcome, detail):
        self.outcomes.append(
            {
                "time": dt_util.utcnow().isoformat(),
                "event": key,
                "outcome": outcome,
                "detail": detail,
            }
        )

    @callback
    def _notify(self):
        async_dispatcher_send(self.hass, self.signal)

    def snapshot(self):
        now = dt_util.utcnow()
        handover = {}
        for entity, data in self._handover.items():
            elapsed = (now - instant(data["start"])).total_seconds()
            duration = (instant(data["deadline"]) - instant(data["start"])).total_seconds()
            handover[entity] = data | {"progress": min(1, max(0, elapsed / max(1e-6, duration)))}
        return {
            "config_entry_id": self.entry_id,
            "name": self.program.name,
            "mode": "daily",
            "enabled": self.enabled,
            "paused": self.paused,
            "dry_run": self.dry_run,
            "active": self.active,
            "status": self.status,
            "reason": self.reason,
            "session": self.session,
            "next_event": self.next_event.isoformat() if self.next_event else None,
            "handover_deadline": self.handover_deadline.isoformat()
            if self.handover_deadline
            else None,
            "handover": handover,
            "remote_owned": self.remote_owned,
            "remote_deadline": next(
                (
                    a.deadline.isoformat()
                    for a in self._activities.values()
                    if a.deadline and any(e.startswith("remote.") for e in a.resources)
                ),
                None,
            ),
            "activities": [a.to_dict() for a in self._activities.values()],
            "yielded": sorted(self._yielded),
            "last_error": self.last_error,
            "source_revision": revision(self.program),
            "behavior_hash": behavior_hash(self.program),
            "journal_count": len(self._journal),
            "outcomes": list(self.outcomes),
            "events": [
                {"time": e.at.isoformat(), "event": e.kind, "id": e.key}
                for e in sorted(self._queue)
            ],
        }

    async def async_close(self, *, cleanup=True):
        if self.closed:
            return
        was_active = self.active
        self.closed = True
        self._invalidate()
        if self._state_unsub:
            self._state_unsub()
            self._state_unsub = None
        for unsubscribe in self._unsubs:
            unsubscribe()
        self._unsubs.clear()
        async with self._lock:
            if cleanup:
                await self._stop_owned()
            # Shutdown preserves active-session continuity and lifecycle snapshots.
            self.active = was_active if not cleanup else False
            await self._persist()
            self.active = False
            self.status, self.reason = "inactive", "Integration unloaded"
            self._notify()
