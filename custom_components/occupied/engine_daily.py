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
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import (
    async_track_point_in_utc_time,
    async_track_state_change_event,
)
from homeassistant.util import dt as dt_util

from .actions import light_capabilities, light_matches, light_observation, observe, service_payload
from .activation import ActivationGate
from .const import DOMAIN, SIGNAL_PREFIX
from .handover import calls_for_target
from .lighting import LightState, project_lighting
from .models import Handover, controlled_entities, projectable_lights
from .planner import DailyPlan, PlanEvent, ResolvedAction, preview_dates
from .runtime_planning import MAX_EVENTS, runtime_dates
from .storage import DurableStore, instant, plan_from_data, program_store
from .time_sources import planning_context, source_entities
from .time_utils import simulation_date_at
from .validation import (
    ProgramError,
    RevisionConflict,
    behavior_hash,
    program_data,
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
        self.gate = ActivationGate(hass, [])
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
        self._latest_intents = {}
        self._yielded = set()
        self._owned = {}
        self._handover = {}
        self._native_fades = set()
        self._virtual = {}
        self._restoring = False
        self._saved_context = None
        self._storage_failed = False
        self.configuration_ready = True
        self.source_manager = None

    @property
    def next_event(self):
        return self._queue[0].at if self._queue else None

    @property
    def handover_deadline(self):
        return max((instant(v["deadline"]) for v in self._handover.values()), default=None)

    def _context(self):
        return planning_context(self.hass)

    def _context_identity(self, context=None):
        context = context or self._context()
        return [
            context.timezone,
            context.latitude,
            context.longitude,
            context.elevation,
            {
                entity: context.time_sources.get(entity)
                for entity in sorted(source_entities(self.program))
            },
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
            self._owned = {
                key: value
                for key, value in saved.get("owned", {}).items()
                if key in controlled_entities(self.program)
            }
            self._handover = saved.get("handover", {})
            self._native_fades = set(saved.get("native_fades", []))
            self._virtual = saved.get("virtual", {})
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
        self._time_source_entities = source_entities(self.program)
        entities = controlled_entities(self.program) | self._time_source_entities
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

    async def _async_time_sources_changed(self):
        async with self._lock:
            if self.closed or self._saved_context == self._context_identity():
                return
            try:
                await self._ensure_plans()
            except (ProgramError, ValueError) as err:
                self._invalidate()
                await self._stop_owned()
                self.status, self.reason = "inactive", f"Cannot compile daily plan: {err}"
                self.last_error = str(err)
                self._record("planning", "failed", self.reason)
                await self._persist()
                self._notify()
                return
            if self.active:
                retained = [
                    event for event in self._queue if event.kind not in {"plan", "boundary"}
                ]
                self._queue_plans()
                queued = {event.key for event in self._queue}
                self._queue.extend(event for event in retained if event.key not in queued)
                heapq.heapify(self._queue)
                self._arm_timer()
            self._notify()

    async def _async_reconfigure(self):
        async with self._lock:
            await self._cancel_native_fades()
            self._plans.clear()
            self._restoring = True
            await self._reevaluate_locked()

    def _effective_gate(self):
        if not self.configuration_ready:
            return False, "Managed configuration unresolved; correct the file and reload"
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
                else "Management is paused"
            )
        return self.gate.evaluate()

    @callback
    def _state_changed(self, event):
        entity = event.data["entity_id"]
        if entity in self._time_source_entities:
            if self._saved_context != self._context_identity():
                self.hass.async_create_task(self._async_time_sources_changed())
            if entity not in controlled_entities(self.program):
                return
        if event.context.id in self._contexts or event.context.parent_id in self._contexts:
            if entity in self._owned and (value := self._observe(entity)):
                self._owned[entity] = value
            return
        old, new = event.data.get("old_state"), event.data.get("new_state")
        watched = {
            "brightness",
            "color_temp_kelvin",
            "hs_color",
            "rgb_color",
            "current_activity",
            "media_content_id",
            "source",
            "current_position",
            "current_tilt_position",
        }
        if (
            old is not None
            and new is not None
            and old.state == new.state
            and all(old.attributes.get(key) == new.attributes.get(key) for key in watched)
        ):
            return
        if not self.active or self.dry_run:
            return
        self._yielded.add(entity)
        self._owned.pop(entity, None)
        self._handover.pop(entity, None)
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
        if len(self._journal) > MAX_JOURNAL:
            candidates = sorted(
                (value.get("time", ""), key)
                for key, value in self._journal.items()
                if value.get("status") not in {"pending", "uncertain"}
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
            "yielded": sorted(self._yielded),
            "owned": self._owned,
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
            self._yielded.clear()
            self._virtual.clear()
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
            try:
                await self._ensure_plans()
                self._queue_plans()
                await self._begin_handover(recover=self._restoring)
                self._restoring = False
                self.status = "transitioning" if self._handover else "active"
                self.reason = (
                    "Converging projected lighting" if self._handover else "Managing entities"
                )
                self._arm_timer()
            except (ProgramError, ValueError) as err:
                self._invalidate()
                self.status, self.reason = "inactive", f"Cannot compile daily plan: {err}"
                self.last_error = str(err)
                self._record("planning", "failed", self.reason)
        await self._persist()
        self._notify()

    async def _ensure_plans(self, *, force=False):
        context = self._context()
        identity = self._context_identity(context)
        today = simulation_date_at(self.program, dt_util.utcnow(), context)
        dates = runtime_dates(self.program, today)
        if force or self._saved_context != identity:
            self._plans.clear()
        missing = [day for day in dates if day not in self._plans]
        if missing:
            plans = await self.hass.async_add_executor_job(
                partial(preview_dates, self.program, missing, self._seed, context=context)
            )
            for plan in plans:
                if not plan.feasible or len(plan.events) > MAX_EVENTS:
                    raise ValueError(f"Infeasible or oversized plan for {plan.simulation_date}")
                self._plans[plan.simulation_date] = plan
        self._plans = {
            day: plan
            for day, plan in self._plans.items()
            if day in dates or any(e.at >= dt_util.utcnow() for e in plan.events)
        }
        self._saved_context = identity
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
        events = [
            event
            for plan in self._plans.values()
            for event in plan.events
            if current.start <= event.at < current.end
        ]
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
            for event in plan.events:
                key = self._key(plan, event)
                if key in self._journal:
                    continue
                if event.at < now:
                    # Covers use future-only activation, including position/tilt
                    # targets. Light handover never reconciles past cover calls.
                    self._journal[key] = {
                        "status": "historical_skipped",
                        "date": now.date().isoformat(),
                    }
                elif event.at < current.end:
                    self._push(event.at, "plan", key, (plan, event), event.order_key[1:])
        self._push(current.end, "boundary", f"boundary:{current.end}", order=(0, 0, "", 0))

    async def _begin_handover(self, *, recover=False):
        now = dt_util.utcnow()
        old = self._handover if recover else {}
        self._handover = {}
        observed = {
            entity: light_observation(self._lighting_source(), entity)
            for entity in projectable_lights(self.program)
        }
        managed = project_lighting(
            self.program, self._projection_plan(now), now, yielded=frozenset(self._yielded)
        )
        config = Handover()
        for entity in managed:
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
                        self._record(event.key, "failed", self.reason)
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
                    "Converging projected lighting" if self._handover else "Managing entities"
                )
            self._arm_timer()
            self._notify()

    async def _call(self, action, key, generation, *, retry=0, cleanup=False, allow_retry=True):
        previous = self._journal.get(key, {}).get("status")
        if previous in {"dispatched", "would_dispatch"}:
            return True
        if previous in {"uncertain", "historical_skipped"}:
            return False
        if not cleanup and (generation != self.generation or not self._effective_gate()[0]):
            return False
        if (set(action.targets) | set(action.resources)) & self._yielded:
            return False
        registry = er.async_get(self.hass)
        disabled = [
            entity
            for entity in action.targets
            if (entry := registry.async_get(entity)) and entry.disabled_by
        ]
        if disabled:
            self._finish(
                key,
                "entity_disabled",
                action,
                f"Skipping {action.action}; disabled entities: {', '.join(disabled)}",
            )
            return False
        unresolved = [entity for entity in action.targets if self._observe(entity) is None]
        if action.action.startswith(("light.", "switch.")) and unresolved:
            self._finish(
                key,
                "unavailable",
                action,
                f"Skipping {action.action}; unresolved entities: {', '.join(unresolved)}",
            )
            return False
        if unresolved:
            self._record(
                key,
                "entity_unresolved",
                f"Attempting {action.action}; unresolved entities: {', '.join(unresolved)}",
            )
        domain, service = action.action.split(".")
        data = service_payload(self.hass, action)
        if not self.hass.services.has_service(domain, service):
            self._finish(
                key,
                "service_missing",
                action,
                f"Skipping {action.action} for {', '.join(action.targets)}; "
                "service is not registered",
            )
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
        if (not cleanup and (generation != self.generation or not self._effective_gate()[0])) or (
            set(action.targets) | set(action.resources)
        ) & self._yielded:
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
            self.last_error = (
                f"{action.action} for {', '.join(action.targets)}: {type(err).__name__}: {err}"
            )
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
        if not action.replay_safe:
            return
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
        if action.action in {"light.turn_on", "light.turn_off"} and any(
            entity in self._handover for entity in action.targets
        ):
            self._finish(key, "subsumed_handover")
            return
        conflicts = set(action.targets) & self._handover.keys()
        if conflicts:
            at = max(instant(self._handover[e]["deadline"]) for e in conflicts)
            self._push(at, "plan", key, (plan, event), event.order_key[1:])
            self._record(key, "deferred_handover", "Target is still converging")
            return
        await self._call(action, key, generation)

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
            if current.state == "on" and current.brightness_pct is not None:
                data["brightness"] = max(1, round(current.brightness_pct * 255 / 100))
            action = ResolvedAction(f"light.turn_{current.state}", (entity,), data, (entity,), True)
            # Hold only the controller's still-owned transition at its observed level.
            await self._call(
                action,
                f"cancel_fade:{self.session}:{entity}:{secrets.token_hex(4)}",
                None,
                cleanup=True,
            )

    async def _stop_owned(self):
        await self._cancel_native_fades()
        self._handover.clear()
        self._owned.clear()

    async def async_replace_program(self, program, *, expected_revision=None, persist_program=True):
        gate = ActivationGate(self.hass, [])
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
            if persist_program:
                await program_store(self.hass, self.entry_id).async_save(program_data(program))
            was_ready = self.configuration_ready
            self.configuration_ready = True
            if behavior_hash(program) == behavior_hash(self.program):
                self.program = program
                self.config["name"] = program.name
                if not was_ready and self.started:
                    await self._reevaluate_locked()
                else:
                    await self._persist()
                    self._notify()
                return
            self._invalidate()
            if self.started:
                await self._cancel_native_fades()
            self.program, self.gate = program, gate
            self.config["name"] = program.name
            self._plans.clear()
            self._handover.clear()
            if self.started:
                self._restoring = True
                self._listen_states()
                await self._reevaluate_locked()
            else:
                await self._persist()
                self._notify()

    def _record(self, key, outcome, detail):
        if outcome in {"failed", "invalid_plan"}:
            _LOGGER.error(
                "Occupied %s (%s), event %s: %s: %s",
                self.program.name,
                self.entry_id,
                key,
                outcome,
                detail,
            )
        elif outcome in {
            "entity_disabled",
            "entity_unresolved",
            "unavailable",
            "service_missing",
            "handover_skipped",
        }:
            _LOGGER.warning(
                "Occupied %s (%s), event %s: %s: %s",
                self.program.name,
                self.entry_id,
                key,
                outcome,
                detail,
            )
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
        from .instances import INSTANCE_SIGNAL

        async_dispatcher_send(self.hass, INSTANCE_SIGNAL)

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
            "configuration_source": self.source_manager.snapshot()
            if self.source_manager
            else {"mode": "gui", "status": "ready"},
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
