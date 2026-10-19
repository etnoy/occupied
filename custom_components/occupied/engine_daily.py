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

from homeassistant.const import (
    EVENT_CORE_CONFIG_UPDATE,
    EVENT_HOMEASSISTANT_STOP,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import Context, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import (
    async_track_point_in_utc_time,
    async_track_state_change_event,
)
from homeassistant.helpers.start import async_at_started
from homeassistant.util import dt as dt_util

from .actions import (
    ServiceWaitTimeout,
    dispatch_service,
    light_capabilities,
    light_matches,
    light_observation,
    observe,
    service_payload,
)
from .activation import ActivationGate
from .activity import async_log_action
from .anchor_latches import AnchorLatches, source_fields
from .const import DOMAIN, SIGNAL_PREFIX
from .covers import cover_target
from .device_motion import complete as motion_complete
from .device_motion import motion_for, progresses
from .handover import calls_for_target
from .lighting import LightState, project_lighting
from .models import Handover, controlled_entities, projectable_lights
from .plan_codec import PlannerVersionChanged
from .plan_persistence import plan_context, plan_fingerprint, restore_plan_fingerprints
from .planner import DailyPlan, PlanEvent, ResolvedAction, preview_dates, supersede_ticks
from .reconciliation import expected_actions
from .runtime_planning import MAX_EVENTS, runtime_dates
from .storage import DurableStore, instant, plan_from_data, program_store
from .time_sources import planning_context, source_entities
from .time_utils import PlanningContext, simulation_date_at
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
DISPATCH_BATCH = 64
ENFORCEMENT_CONCURRENCY = 32
MAX_JOURNAL = 50000
BOUNDARY_GRACE = timedelta(minutes=5)


@dataclass(order=True)
class RuntimeEvent:
    at: datetime
    order: tuple
    key: str = field(compare=False)
    kind: str = field(compare=False)
    payload: object = field(default=None, compare=False)
    attempt: int = field(default=0, compare=False)


class DailyEngine:
    """Serialize scheduling and journal writes; invalidate work when the gate closes."""

    def __init__(self, hass, entry_id, program):
        self.hass, self.entry_id, self.program = hass, entry_id, program
        self.config = {"name": program.name}
        self.signal = f"{SIGNAL_PREFIX}_{entry_id}"
        self.gate = ActivationGate.for_run_condition(hass, program.run_condition)
        self.enforce_state_on_start = bool(
            program.run_condition and program.run_condition.enforce_state_on_start
        )
        self.activation_deadline = None
        self.reconciliation = {"phase": "idle", "results": {}}
        self.enabled = self.paused = self.active = self.started = self.closed = False
        self.session = self.generation = 0
        self.status, self.reason = "disabled", "Disabled by user"
        self.last_error = None
        self.outcomes = deque(maxlen=100)
        self._permission = DurableStore(
            hass, 1, f"{DOMAIN}.{entry_id}.permission", atomic_writes=True
        )
        self._store = DurableStore(hass, 1, f"{DOMAIN}.{entry_id}.runtime", atomic_writes=True)
        self._lock = asyncio.Lock()
        self._persist_lock = asyncio.Lock()
        from .live_preview import LivePreviewManager

        self.live_preview = LivePreviewManager(self)
        self._cancel_timer: Callable | None = None
        self._cancel_planning_retry: Callable | None = None
        self._unsubs = []
        self._stop_unsub: Callable | None = None
        self._state_unsub = None
        self._contexts = deque(maxlen=1000)
        self._queue: list[RuntimeEvent] = []
        self._plans: dict[date, DailyPlan] = {}
        self._plan_contexts = {}
        self._fingerprinted_plans = None
        self._plan_fingerprints = []
        self._seed = secrets.token_hex(16)
        self._journal = {}
        self._latest_intents = {}
        self._yielded = set()
        self._owned = {}
        self._handover = {}
        self._native_fades = set()
        self._motions = {}
        self._restoring = False
        self._saved_context = None
        self._anchor_latches = AnchorLatches()
        self._storage_failed = False
        self.configuration_ready = True
        self.source_manager = None

    @property
    def source_revision(self):
        return (self.source_manager.recovery_revision if self.source_manager else None) or revision(
            self.program
        )

    @property
    def next_event(self) -> datetime | None:
        """Report scheduled work, keeping daily plan refreshes internal."""
        if not self._queue:
            return None
        next_due = self._queue[0]
        if next_due.kind != "boundary":
            return next_due.at
        boundary = next_due.at
        next_action = min(
            (event.at for event in self._queue if event.kind != "boundary"), default=None
        )

        # Only today's actions are queued. Use the already compiled plans to
        # show upcoming work beyond midnight without changing timer dispatch.
        queued = {event.key for event in self._queue}
        next_planned = min(
            (
                event.at
                for plan in self._plans.values()
                for event in plan.events
                if event.at >= boundary
                and not event.superseded
                and self._key(plan, event) not in self._journal
                and self._key(plan, event) not in queued
            ),
            default=next_action,
        )
        return next_planned if next_action is None else min(next_action, next_planned)

    @property
    def handover_deadline(self):
        return max((instant(v["deadline"]) for v in self._handover.values()), default=None)

    def _context(self):
        return self._anchor_latches.apply(
            self.program,
            planning_context(self.hass, source_entities(self.program)),
            dt_util.utcnow(),
        )

    def _context_identity(self, context=None):
        context = context or self._context()
        return [
            context.timezone,
            context.latitude,
            context.longitude,
            context.elevation,
            {
                entity: {
                    "kind": context.time_sources.get(entity, {}).get("kind"),
                    **{
                        attribute: context.time_sources.get(entity, {}).get(attribute)
                        for attribute in sorted(attributes)
                    },
                    "latched": {
                        day: overrides
                        for day, values in context.time_source_latches.items()
                        if (
                            overrides := {
                                attribute: value
                                for attribute, value in values.get(entity, {}).items()
                                if attribute in attributes
                                and value != context.time_sources.get(entity, {}).get(attribute)
                            }
                        )
                    },
                }
                for entity, attributes in sorted(source_fields(self.program).items())
            },
        ]

    def _observe(self, entity):
        return observe(self.hass, entity)

    async def async_prepare(self):
        await self.gate.async_prepare()
        permission = await self._permission.async_load() or {}
        self.enabled = permission.get("enabled", False)
        self.paused = permission.get("paused", False)
        if "dry_run" in permission:
            # Removing simulation must never turn an enabled rehearsal into a live run.
            if permission["dry_run"]:
                self.enabled = False
        if "dry_run" in permission or "enforce_state_on_start" in permission:
            await self._save_permission()
        await self.live_preview.async_prepare()
        saved = await self._store.async_load() or {}
        if saved.get("behavior") == behavior_hash(self.program):
            self._anchor_latches.restore(saved.get("anchor_latches"))
        self._seed = saved.get("seed", self._seed)
        self.session = saved.get("session", 0)
        self._restoring = (
            saved.get("active", False)
            and not saved.get("dry_run", False)
            and saved.get("run_condition") == self._run_condition_data()
            and saved.get("reconciliation", {}).get("phase")
            not in {"waiting", "applying", "cancelled"}
        )
        if not saved.get("dry_run", False):
            self.reconciliation = saved.get("reconciliation", self.reconciliation)
        self._journal = {
            self._restore_journal_key(key): value
            for key, value in saved.get("journal", {}).items()
            if not key.startswith(("dry:", "enforce:dry:"))
            and value.get("status") != "would_dispatch"
        }
        self._saved_context = saved.get("context")
        self._contexts.extend(saved.get("contexts", []))
        if not saved.get("dry_run", False):
            self._yielded = set(saved.get("yielded", []))
            self._owned = {
                key: value
                for key, value in saved.get("owned", {}).items()
                if key in controlled_entities(self.program)
            }
            self._handover = saved.get("handover", {})
            self._native_fades = set(saved.get("native_fades", []))
            if saved.get("behavior") == behavior_hash(self.program):
                self._motions = {
                    entity: motion
                    for entity, motion in saved.get("motions", {}).items()
                    if entity in controlled_entities(self.program)
                }
        context = self._context()
        if saved.get("behavior") == behavior_hash(
            self.program
        ) and self._saved_context == self._context_identity(context):
            try:
                if "plan_fingerprints" in saved:
                    records = saved["plan_fingerprints"]
                    self._plans = await self.hass.async_add_executor_job(
                        restore_plan_fingerprints, self.program, records
                    )
                    self._plan_contexts = {
                        date.fromisoformat(record["simulation_date"]): record["context"]
                        for record in records
                    }
                else:
                    # Accept the previous full cache, then migrate on the next save.
                    self._plans = {
                        p.simulation_date: p
                        for p in (plan_from_data(value) for value in saved.get("plans", []))
                    }
                    data = plan_context(self.program, context)
                    self._plan_contexts = dict.fromkeys(self._plans, data)
            except PlannerVersionChanged as err:
                self._plans.clear()
                self._record("recovery", "plan_version_changed", str(err))
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
            observed = self._observe(entity)
            if observed is None:
                # Devices can still be loading; missing state is not manual control.
                self._owned.pop(entity)
                self._handover.pop(entity, None)
                self._native_fades.discard(entity)
            elif observed != expected:
                state = self.hass.states.get(entity)
                if self._accept_motion(entity, state.context) or (
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
        self._stop_unsub = self.hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, self._shutdown)
        self._unsubs.append(
            self.hass.bus.async_listen(EVENT_CORE_CONFIG_UPDATE, self._config_changed)
        )
        if self.hass.is_running:
            self.started = True
            await self.async_reevaluate()
        else:
            self.status, self.reason = "waiting", "Waiting for Home Assistant startup"
            self._unsubs.append(async_at_started(self.hass, self._async_started))
        self._notify()

    def _listen_states(self):
        if self._state_unsub:
            self._state_unsub()
        self._time_source_entities = source_entities(self.program)
        entities = (
            controlled_entities(self.program) | self._time_source_entities | self.gate.entities
        )
        if self.live_preview.condition_gate:
            entities |= self.live_preview.condition_gate.entities
        self._state_unsub = async_track_state_change_event(self.hass, entities, self._state_changed)

    async def _async_started(self, _):
        self.started = True
        await self.async_reevaluate()

    @callback
    def _shutdown(self, event):
        # The one-time listener has already been removed by HA.
        self._stop_unsub = None
        self.hass.async_create_task(self._async_shutdown(event))

    async def _async_shutdown(self, _):
        await self.async_close(cleanup=False)

    @callback
    def _config_changed(self, _):
        if self._saved_context != self._context_identity():
            self._invalidate(preserve_activation=True)
            self.hass.async_create_task(self._async_reconfigure())

    async def _async_time_sources_changed(self):
        async with self._lock:
            if self.closed or not self.enabled:
                return
            if not self.active:
                # An enabled controller may be recovering from a planning error,
                # or waiting on startup, pause or its run condition. Reevaluate
                # those gates before compiling and rebuild the queue on recovery.
                await self._reevaluate_locked()
                return
            if self._saved_context == self._context_identity():
                if self._anchor_latches.dirty:
                    await self._persist()
                return
            try:
                await self._ensure_plans()
            except (ProgramError, ValueError) as err:
                self._invalidate()
                # A failed rebuild can leave only part of the cache populated.
                # Returning a source to its previous good value must still
                # trigger recovery, rather than matching that obsolete context.
                self._saved_context = None
                await self._stop_owned()
                self.status, self.reason = "error", f"Cannot compile daily plan: {err}"
                self.last_error = str(err)
                self._record("planning", "failed", self.reason)
                self._schedule_planning_retry()
                await self._persist()
                self._notify()
                return
            if self.active and self.activation_deadline is None:
                retained = [
                    event for event in self._queue if event.kind not in {"plan", "boundary"}
                ]
                self._queue_plans(preserve_pending=True)
                queued = {event.key for event in self._queue}
                self._queue.extend(event for event in retained if event.key not in queued)
                heapq.heapify(self._queue)
                self._update_active_status()
                self._arm_timer()
            self._notify()

    async def _async_reconfigure(self):
        async with self._lock:
            if self.closed:
                return
            await self._cancel_native_fades()
            self._plans.clear()
            self._restoring = True
            await self._reevaluate_locked()

    def _effective_gate(self):
        if not self.configuration_ready:
            if self.source_manager and self.source_manager.recovery is not None:
                self.live_preview.invalidate("Stored configuration unresolved", interrupted=True)
                return False, "Stored configuration unresolved; correct it in Occupied Settings"
            self.live_preview.invalidate("Managed configuration unresolved", interrupted=True)
            return False, "Managed configuration unresolved; correct the file and reload"
        if self._storage_failed:
            self.live_preview.invalidate("Controller persistence failed", interrupted=True)
            return False, "Runtime persistence failed; reload or enable to retry"
        if self.closed or not self.started or not self.enabled or self.paused:
            return False, (
                "Integration unloaded"
                if self.closed
                else "Waiting for Home Assistant startup"
                if not self.started
                else "Disabled by user"
                if not self.enabled
                else "Management is paused"
            )
        return self.run_condition_status()

    def run_condition_status(self):
        return self.gate.run_status(self.program.run_condition)

    def _run_condition_data(self):
        config = self.program.run_condition
        return (
            config.model_dump(mode="json") | {"enforce_state_on_start": self.enforce_state_on_start}
            if config
            else None
        )

    @callback
    def _forget_owned(self):
        """Internal cancellation only: never hold a fade or stop a device."""
        self._handover.clear()
        self._owned.clear()
        self._native_fades.clear()
        self._motions.clear()

    @callback
    def _state_changed(self, event):
        entity = event.data["entity_id"]
        preview_gate = self.live_preview.condition_gate
        if entity in self.gate.entities or (preview_gate and entity in preview_gate.entities):
            old, new = event.data.get("old_state"), event.data.get("new_state")
            # Daily and live-preview run conditions are state predicates. GPS
            # and other attribute updates cannot change their result.
            if old is None or new is None or old.state != new.state:
                if not self.run_condition_status()[0]:
                    self._invalidate()
                    self._forget_owned()
                if not self.live_preview.condition_passes():
                    self.live_preview.invalidate("Run condition ended", interrupted=True)
                self.hass.async_create_task(self._async_condition_changed())
            if entity not in controlled_entities(self.program) | self._time_source_entities:
                return
        if entity in self._time_source_entities:
            if self._saved_context != self._context_identity() or self._anchor_latches.dirty:
                self.hass.async_create_task(self._async_time_sources_changed())
            if entity not in controlled_entities(self.program):
                return
        old, new = event.data.get("old_state"), event.data.get("new_state")
        if any(
            state is None or state.state in {STATE_UNKNOWN, STATE_UNAVAILABLE}
            for state in (old, new)
        ):
            # Availability changes do not establish an outside actor's intent.
            # Drop ownership without holding a transition or suppressing future steps.
            self._owned.pop(entity, None)
            self._handover.pop(entity, None)
            self._native_fades.discard(entity)
            self._motions.pop(entity, None)
            if self.active:
                self.hass.async_create_task(self._async_observation_changed(entity))
            return
        if (
            self._accept_motion(entity, event.context)
            or event.context.id in self._contexts
            or event.context.parent_id in self._contexts
        ):
            if entity in self._owned and (value := self._observe(entity)):
                self._owned[entity] = value
            return
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
        if not self.active:
            return
        self._yielded.add(entity)
        self._motions.pop(entity, None)
        self._owned.pop(entity, None)
        self._handover.pop(entity, None)
        self.hass.async_create_task(self._async_observation_changed(entity))

    def _accept_motion(self, entity, context):
        motion = self._motions.get(entity)
        if motion is None:
            return False
        if (
            context.id in self._contexts
            or context.parent_id in self._contexts
            or (context.user_id is None and context.parent_id is None)
        ) and progresses(motion, self._observe(entity), dt_util.utcnow()):
            if motion_complete(motion):
                self._motions.pop(entity, None)
            return True
        self._motions.pop(entity, None)
        return False

    async def _async_condition_changed(self):
        async with self._lock:
            await self.live_preview.finish_stop_locked()
            await self._reevaluate_locked()

    async def _async_observation_changed(self, entity):
        async with self._lock:
            await self._cancel_native_fades({entity})
            await self._persist()
            self._notify()

    @callback
    def _invalidate(self, *, preserve_activation=False):
        self.active = False
        if not preserve_activation:
            self.activation_deadline = None
        if self.reconciliation["phase"] in {"waiting", "applying"}:
            self.reconciliation["phase"] = "cancelled"
        self.generation += 1
        self._queue.clear()
        if self._cancel_timer:
            self._cancel_timer()
            self._cancel_timer = None
        if self._cancel_planning_retry:
            self._cancel_planning_retry()
            self._cancel_planning_retry = None

    @callback
    def _schedule_planning_retry(self):
        """Reevaluate failed planning at the next local date while permission remains open."""
        self._saved_context = None
        if not self._effective_gate()[0]:
            return
        tomorrow = dt_util.start_of_local_day(dt_util.now() + timedelta(days=1))

        @callback
        def retry(_):
            self._cancel_planning_retry = None
            self.hass.async_create_task(self.async_reevaluate())

        self._cancel_planning_retry = async_track_point_in_utc_time(
            self.hass, retry, dt_util.as_utc(tomorrow)
        )

    def _stored_plan_fingerprints(self):
        plans = tuple(self._plans.values())
        cached = self._fingerprinted_plans
        if (
            cached is None
            or len(cached) != len(plans)
            or any(current is not previous for current, previous in zip(plans, cached, strict=True))
        ):
            self._plan_fingerprints = [
                plan_fingerprint(plan, self._plan_contexts[plan.simulation_date]) for plan in plans
            ]
            self._fingerprinted_plans = plans
        return self._plan_fingerprints

    async def _persist(self):
        async with self._persist_lock:
            return await self._persist_locked()

    async def _persist_locked(self):
        if source_fields(self.program):
            self._context()
        latch_version = self._anchor_latches.version
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
            "behavior": behavior_hash(self.program),
            "run_condition": self._run_condition_data(),
            "activation_deadline": self.activation_deadline.isoformat()
            if self.activation_deadline
            else None,
            "reconciliation": self.reconciliation,
            "context": self._saved_context,
            "anchor_latches": self._anchor_latches.snapshot(),
            "plan_fingerprints": self._stored_plan_fingerprints(),
            "journal": self._journal,
            "yielded": sorted(self._yielded),
            "owned": self._owned,
            "handover": self._handover,
            "native_fades": sorted(self._native_fades),
            "motions": self._motions,
            "contexts": list(self._contexts),
        }
        try:
            if len(self._journal) > MAX_JOURNAL:
                raise HomeAssistantError(
                    "Execution journal exceeds its bounded runtime limit",
                    translation_domain=DOMAIN,
                    translation_key="journal_limit",
                )
            await self._store.async_save(deepcopy(snapshot))
        except HomeAssistantError as err:
            self._storage_failed = True
            self.live_preview.invalidate("Controller persistence failed", interrupted=True)
            self._invalidate()
            self.status, self.reason = "error", "Runtime persistence failed"
            self.last_error = str(err)
            self._record("storage", "failed", str(err))
            return False
        self._anchor_latches.persisted_version = latch_version
        return True

    async def _save_permission(self):
        await self._permission.async_save(
            {
                "enabled": self.enabled,
                "paused": self.paused,
            }
        )

    async def async_set_enabled(self, enabled):
        if not enabled:
            self.live_preview.invalidate("Occupied stopped")
        self._storage_failed = False
        self.enabled = enabled
        if not enabled:
            self._invalidate()
        async with self._lock:
            await self.live_preview.finish_stop_locked()
            await self._save_permission()
            await self._reevaluate_locked()

    async def async_set_paused(self, paused):
        if not paused:
            self.live_preview.invalidate("Scheduling resumed")
            self._storage_failed = False
        self.paused = paused
        if paused:
            self._invalidate()
        async with self._lock:
            await self.live_preview.finish_stop_locked()
            await self._save_permission()
            await self._reevaluate_locked()

    async def async_reevaluate(self):
        async with self._lock:
            await self._reevaluate_locked()

    async def async_enforce_state_now(self):
        """Repair drift immediately, reclaiming yielded targets for this activation."""
        async with self._lock:
            passed, reason = self._effective_gate()
            if not passed:
                raise HomeAssistantError(
                    f"Cannot enforce expected states: {reason}",
                    translation_domain=DOMAIN,
                    translation_key="enforce_unavailable",
                    translation_placeholders={"reason": str(reason)},
                )
            generation = self.generation
            try:
                await self._ensure_plans()
            except (ProgramError, ValueError) as err:
                raise HomeAssistantError(
                    f"Cannot enforce expected states: {err}",
                    translation_domain=DOMAIN,
                    translation_key="enforce_unavailable",
                    translation_placeholders={"reason": str(err)},
                ) from err
            passed, reason = self._effective_gate()
            if not passed:
                raise HomeAssistantError(
                    f"Cannot enforce expected states: {reason}",
                    translation_domain=DOMAIN,
                    translation_key="enforce_unavailable",
                    translation_placeholders={"reason": str(reason)},
                )
            if generation != self.generation:
                raise HomeAssistantError(
                    "Cannot enforce expected states: controller changed",
                    translation_domain=DOMAIN,
                    translation_key="enforce_controller_changed",
                )

            # Replace delayed activation, handover, and retries with current-time intent.
            self._invalidate()
            self.active = True
            self._restoring = False
            self._yielded.clear()
            generation = self.generation
            self.reconciliation = {"phase": "applying", "results": {}}
            try:
                await self._cancel_native_fades(generation=generation)
                self._forget_owned()
                if generation == self.generation and self._effective_gate()[0]:
                    at = dt_util.utcnow()
                    self._queue_plans(skip_through=at)
                    await self._enforce_expected_state(
                        at,
                        generation,
                        key_prefix=f"enforce:manual:{secrets.token_hex(16)}",
                        immediate=True,
                    )
            finally:
                if generation != self.generation or not self._effective_gate()[0]:
                    await self._reevaluate_locked()
                else:
                    self._update_active_status()
                    await self._persist()
                    self._arm_timer()
                    self._notify()

    async def _reevaluate_locked(self):
        if self.closed:
            return
        passed, reason = self._effective_gate()
        if not passed:
            self._invalidate()
            if self.started and not self.closed:
                await self._stop_owned()
            if not self.configuration_ready or self._storage_failed:
                self.status = "error"
            elif not self.enabled:
                self.status = "disabled"
            elif self.paused:
                self.status = "paused"
            elif not self.started or not self.run_condition_status()[0]:
                self.status = "waiting"
            else:
                self.status = "error"
            self.reason = reason
            self._restoring = False
        elif not self.active:
            if self._cancel_planning_retry:
                self._cancel_planning_retry()
                self._cancel_planning_retry = None
            self.active = True
            self.generation += 1
            if not self._restoring or self.program.run_condition is not None:
                self._handover.clear()
                self._native_fades.clear()
            if not self._restoring:
                self.session += 1
                self._yielded.clear()
            try:
                await self._ensure_plans()
                if not self.active or not self._effective_gate()[0]:
                    await self._reevaluate_locked()
                    return
                config = self.program.run_condition
                if (
                    config
                    and self.enforce_state_on_start
                    and (not self._restoring or self.activation_deadline is not None)
                ):
                    if not self._restoring or self.activation_deadline is None:
                        self.activation_deadline = dt_util.utcnow() + timedelta(
                            seconds=config.start_delay
                        )
                    self.reconciliation = {"phase": "waiting", "results": {}}
                    self._push(self.activation_deadline, "activation", f"activation:{self.session}")
                else:
                    self._queue_plans()
                    if config is None:
                        await self._begin_handover(recover=self._restoring)
                self._restoring = False
                self._update_active_status()
                self._arm_timer()
            except (ProgramError, ValueError) as err:
                self._invalidate()
                self.status, self.reason = "error", f"Cannot compile daily plan: {err}"
                self.last_error = str(err)
                self._record("planning", "failed", self.reason)
                self._schedule_planning_retry()
        await self._persist()
        self._notify()

    def _update_active_status(self):
        if self.activation_deadline:
            self.status = "waiting"
            self.reason = "Run condition met; waiting to enforce expected states"
        else:
            now = dt_util.utcnow()
            completed = total = 0
            for plan, event in self._pending_staggers().values():
                if event.authored_at > now:
                    continue
                members = (
                    member
                    for member in plan.occurrences[event.occurrence_id]
                    if member.configured_index == event.configured_index and member.tick
                )
                for member in members:
                    total += 1
                    status = self._journal.get(self._key(plan, member), {}).get("status")
                    completed += bool(status and status != "pending")
            if total:
                self.status = "staggering"
                self.reason = f"Staggering: {completed}/{total} events"
                return
            self.status = "transitioning" if self._handover else "active"
            self.reason = "Converging projected lighting" if self._handover else "Managing entities"

    def _pending_staggers(self):
        """Include unfinished actions whose remaining ticks fall after the daily queue boundary."""
        groups = {}
        for plan in self._plans.values():
            for event in plan.events:
                if (
                    event.tick
                    and not event.superseded
                    and self._key(plan, event) not in self._journal
                ):
                    groups[(event.occurrence_id, event.configured_index)] = (plan, event)
        return groups

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
            data = plan_context(self.program, context)
            for plan in plans:
                if not plan.feasible or len(plan.events) > MAX_EVENTS:
                    raise ValueError(f"Infeasible or oversized plan for {plan.simulation_date}")
                self._plans[plan.simulation_date] = plan
                self._plan_contexts[plan.simulation_date] = data
                for issue in plan.issues:
                    if (
                        issue.code in {"random_window", "random_window_overlap"}
                        and issue.severity == "warning"
                    ):
                        self._record(
                            f"planning:{plan.simulation_date}:{issue.path}",
                            "random_window_skipped",
                            issue.message,
                        )
        self._plans = {
            day: plan
            for day, plan in self._plans.items()
            if day in dates or any(e.at >= dt_util.utcnow() for e in plan.events)
        }
        self._plan_contexts = {day: self._plan_contexts[day] for day in self._plans}
        self._saved_context = identity
        cutoff = (today - timedelta(days=2)).isoformat()
        self._journal = {
            key: value
            for key, value in self._journal.items()
            if value.get("date", today.isoformat()) >= cutoff
            or (key.startswith("live:step:") and key.split(":", 3)[2] >= cutoff)
        }
        if len(self._journal) > MAX_JOURNAL:
            raise ValueError("Execution journal exceeds the bounded runtime limit")
        await self._persist()

    def _plan_at(self, at):
        day = simulation_date_at(self.program, at, PlanningContext(self.hass.config.time_zone))
        return self._plans[day]

    def _projection_plan(self, at, *, include_previous_day=False):
        current = self._plan_at(at)
        # Enforcement carries explicit intent over midnight, using local calendar
        # boundaries so the preceding day can be 23 or 25 hours long.
        start = (
            self._plan_at(current.start - timedelta(microseconds=1)).start
            if include_previous_day
            else current.start
        )
        events = [
            event
            for event in supersede_ticks(e for plan in self._plans.values() for e in plan.events)
            if start <= event.at < current.end
        ]
        return replace(current, events=tuple(sorted(events, key=lambda e: e.order_key)))

    async def _ensure_projection_date(self, at):
        context = self._context()
        day = simulation_date_at(self.program, at, context)
        if day not in self._plans:
            plans = await self.hass.async_add_executor_job(
                partial(preview_dates, self.program, [day], self._seed, context=context)
            )
            if not plans[0].feasible:
                raise ValueError(f"Infeasible handover endpoint plan for {day}")
            self._plans[day] = plans[0]
            self._plan_contexts[day] = plan_context(self.program, context)

    def _key(self, plan, event):
        if event.kind == "step":
            return f"live:step:{event.id}"
        return f"live:{plan.behavior_hash}:{event.id}"

    @staticmethod
    def _restore_journal_key(key):
        """Retain completed source-date steps when replacing obsolete saved plans."""
        parts = key.split(":", 3)
        if (
            len(parts) == 4
            and parts[0] == "live"
            and len(parts[1]) == 64
            and parts[3].startswith("step:")
        ):
            return f"live:step:{parts[2]}:{parts[3]}"
        return key

    def _push(self, at, kind, key, payload=None, order=(20, 1, "", 0), attempt=0):
        heapq.heappush(self._queue, RuntimeEvent(at, order + (key,), key, kind, payload, attempt))

    def _queue_plans(self, *, skip_through=None, since=None, preserve_pending=False):
        now = dt_util.utcnow()
        # Only the daily boundary admits newly visible work from just before
        # now. Source edits always use now; unchanged pending events survive
        # separately below, including deferred handovers and retries.
        cutoff = now if since is None else max(since, now - BOUNDARY_GRACE)
        pending = {event.key: event for event in self._queue} if preserve_pending else {}
        # Retries belong to calls already attempted, so their failed journal
        # entries must not prevent them from surviving a new daily queue.
        self._queue = [event for event in pending.values() if event.kind == "retry"]
        heapq.heapify(self._queue)
        current = self._plan_at(now)
        queued_groups = set()
        resolved = {
            e.id: e
            for e in supersede_ticks(e for plan in self._plans.values() for e in plan.events)
        }
        self._plans = {
            day: replace(plan, events=events) if events != plan.events else plan
            for day, plan in self._plans.items()
            for events in [tuple(resolved[event.id] for event in plan.events)]
        }
        for plan in self._plans.values():
            for event in plan.events:
                key = self._key(plan, event)
                if key in self._journal:
                    continue
                if event.superseded:
                    self._finish(
                        key,
                        "superseded",
                        event.action,
                        "A newer authored intent cancelled this tick",
                    )
                    continue
                previous = pending.get(key)
                unchanged = (
                    previous is not None
                    and previous.kind == "plan"
                    and previous.payload[1] == event
                )
                if not unchanged and (
                    event.at < cutoff or (skip_through is not None and event.at <= skip_through)
                ):
                    # Covers use future-only activation, including position/tilt
                    # targets. Light handover never reconciles past cover calls.
                    self._journal[key] = {
                        "status": "historical_skipped",
                        "date": now.date().isoformat(),
                    }
                elif unchanged or event.at < current.end:
                    if event.custom:
                        group = (plan.behavior_hash, event.group_id)
                        if group in queued_groups:
                            continue
                        queued_groups.add(group)
                    if unchanged:
                        # Preserve delayed handover/group ordering, while using
                        # the refreshed plan for its other authored members.
                        self._push(
                            previous.at,
                            "plan",
                            key,
                            (plan, event),
                            event.order_key[1:],
                            attempt=previous.attempt,
                        )
                    else:
                        self._push(event.at, "plan", key, (plan, event), event.order_key[1:])
        self._push(current.end, "boundary", f"boundary:{current.end}", order=(0, 0, "", 0))

    async def _begin_handover(self, *, recover=False):
        now = dt_util.utcnow()
        old = self._handover if recover else {}
        self._handover = {}
        observed = {
            entity: light_observation(self.hass, entity)
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
            if light_matches(self.hass, entity, target):
                if previous and entity in self._native_fades and deadline > now:
                    self._handover[entity] = previous | {
                        "deadline": deadline.isoformat(),
                        "target": target.to_dict(),
                    }
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
        now = dt_util.utcnow()
        next_update = min(
            [self._queue[0].at]
            + [
                event.authored_at
                for _, event in self._pending_staggers().values()
                if event.authored_at > now
            ]
        )

        @callback
        def due(_):
            self._cancel_timer = None
            if generation == self.generation:
                self.hass.async_create_task(self._async_dispatch(generation))

        self._cancel_timer = async_track_point_in_utc_time(self.hass, due, max(now, next_update))

    def _expected_actions(self, at):
        return expected_actions(
            self.program,
            self._projection_plan(at, include_previous_day=True),
            at,
            yielded=frozenset(self._yielded),
        )

    def _target_matches(self, entity, action):
        if entity.startswith("light."):
            state = action.action.removeprefix("light.turn_")
            return light_matches(self.hass, entity, LightState(state, **action.data))
        observed = self._observe(entity)
        if entity.startswith("switch."):
            return observed["state"] == action.action.removeprefix("switch.turn_")
        axis, target = next(iter(cover_target(action).to_dict().items()))
        return observed["attributes"].get(f"current_{axis}") == target

    async def _enforce_expected_state(self, at, generation, *, key_prefix=None, immediate=False):
        call_prefix = key_prefix or f"enforce:live:{self.session}"
        self.reconciliation["phase"] = "applying"
        self.status = "active" if immediate else "transitioning"
        self.reason = "Enforcing expected states now" if immediate else "Enforcing expected states"
        self._notify()
        results = self.reconciliation["results"]
        cached = None

        def expected_at(instant):
            nonlocal cached
            plans = tuple(self._plans.values())
            identity = (
                self.hass.config.time_zone,
                id(self.program),
                tuple(id(plan) for plan in plans),
                frozenset(self._yielded),
            )
            if cached is None or cached[0] != identity or not cached[1] <= instant < cached[2]:
                until = min(
                    [plan.end for plan in plans if plan.start <= instant < plan.end]
                    + [event.at for plan in plans for event in plan.events if event.at > instant]
                )
                cached = (identity, instant, until, self._expected_actions(instant))
            return cached[3]

        targets = expected_at(at)

        async def reconcile(entity):
            if generation != self.generation or not self._effective_gate()[0]:
                return
            if entity in self._yielded:
                results[entity] = {"status": "skipped", "reason": "Manual control yielded entity"}
                return
            if entity not in targets:
                results[entity] = {
                    "status": "skipped",
                    "reason": "Expected state is unknown or opaque",
                }
                return
            if self._observe(entity) is None:
                results[entity] = {"status": "skipped", "reason": "Entity is unavailable"}
                return
            outcomes = []
            for index, original in enumerate(targets[entity]):
                if self._observe(entity) is None:
                    outcomes.append("unavailable")
                    continue
                # A preceding service handler can advance time past a newer intent.
                actions = expected_at(dt_util.utcnow()).get(entity, [])
                action = next((a for a in actions if a.action == original.action), None)
                if action is None:
                    outcomes.append("superseded")
                    continue
                if self._target_matches(entity, action):
                    outcomes.append("already_matching")
                    continue
                key = f"{call_prefix}:{entity}:{index}"
                dispatched_action = (
                    replace(action, data=action.data | {"transition": 0})
                    if immediate and action.action.startswith("light.")
                    else action
                )
                await self._call(
                    dispatched_action,
                    key,
                    generation,
                    allow_retry=False,
                    still_current=lambda a=action, e=entity: (
                        a in expected_at(dt_util.utcnow()).get(e, [])
                    ),
                )
                outcomes.append(self._journal.get(key, {}).get("status", "cancelled"))
                if generation != self.generation or not self._effective_gate()[0]:
                    return
            status = next(
                (
                    value
                    for value in (
                        "failed",
                        "uncertain",
                        "cancelled_before_dispatch",
                        "dispatched",
                        "service_missing",
                        "entity_disabled",
                        "unavailable",
                        "already_matching",
                    )
                    if value in outcomes
                ),
                "skipped",
            )
            results[entity] = {"status": status, "calls": outcomes}

        entities = sorted(controlled_entities(self.program))
        if immediate:
            semaphore = asyncio.Semaphore(ENFORCEMENT_CONCURRENCY)

            async def bounded_reconcile(entity):
                async with semaphore:
                    await reconcile(entity)

            async with asyncio.TaskGroup() as group:
                for entity in entities:
                    group.create_task(bounded_reconcile(entity))
        else:
            for entity in entities:
                await reconcile(entity)
        if generation != self.generation or not self._effective_gate()[0]:
            return
        self.reconciliation["phase"] = "complete"
        self._record(
            key_prefix or f"enforce:{self.session}",
            "reconciled",
            f"Checked {len(results)} entities",
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
                if event.kind == "activation":
                    self.activation_deadline = None
                    try:
                        await self._ensure_plans()
                        if generation != self.generation or not self._effective_gate()[0]:
                            await self._reevaluate_locked()
                            return
                        at = dt_util.utcnow()
                        self._queue_plans(skip_through=at)
                        await self._enforce_expected_state(at, generation)
                    except (ProgramError, ValueError) as err:
                        self._invalidate()
                        self.status, self.reason = (
                            "error",
                            f"Cannot enforce expected states: {err}",
                        )
                        self.last_error = str(err)
                        self._record(event.key, "failed", self.reason)
                        self._schedule_planning_retry()
                        break
                elif event.kind == "boundary":
                    try:
                        await self._ensure_plans()
                        self._queue_plans(since=event.at, preserve_pending=True)
                        if self.program.run_condition is None:
                            await self._begin_handover()
                    except (ProgramError, ValueError) as err:
                        self._invalidate()
                        await self._stop_owned()
                        self.status, self.reason = "error", f"Cannot compile daily plan: {err}"
                        self.last_error = str(err)
                        self._record(event.key, "failed", self.reason)
                        self._schedule_planning_retry()
                        break
                elif event.kind == "handover_done":
                    if data := self._handover.get(event.payload):
                        target = LightState(**data["target"])
                        if event.payload not in self._yielded and not light_matches(
                            self.hass, event.payload, target
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
                self._update_active_status()
            self._arm_timer()
            self._notify()

    async def _call(
        self,
        action,
        key,
        generation,
        *,
        retry=0,
        cleanup=False,
        allow_retry=True,
        still_current=None,
    ):
        previous = self._journal.get(key, {}).get("status")
        if previous == "dispatched":
            return True
        if previous in {"uncertain", "historical_skipped"} or (
            previous == "failed" and self._journal[key].get("late_result")
        ):
            return False
        # Even cleanup calls must never touch devices after the run condition ends.
        if not self.run_condition_status()[0]:
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
        if (
            not self.run_condition_status()[0]
            or (not cleanup and (generation != self.generation or not self._effective_gate()[0]))
            or (set(action.targets) | set(action.resources)) & self._yielded
            or (still_current is not None and not still_current())
        ):
            self._finish(key, "cancelled_before_dispatch", action)
            await self._persist()
            return False
        for entity in action.targets:
            previous = self._motions.pop(entity, None)
            if motion := motion_for(
                replace(action, data=data), self._observe(entity), dt_util.utcnow()
            ):
                if (
                    action.action.startswith("cover.")
                    and previous
                    and instant(previous["deadline"]) > dt_util.utcnow()
                ):
                    if (
                        "current_position" in previous["targets"]
                        and "current_position" not in motion["targets"]
                    ):
                        motion["state"] = previous["state"]
                    motion["targets"] = previous["targets"] | motion["targets"]
                    motion["states"] = sorted(set(previous["states"]) | set(motion["states"]))
                self._motions[entity] = motion
        try:
            await dispatch_service(
                self.hass,
                action,
                context,
                data=data,
                on_late_result=lambda error: self.hass.async_create_task(
                    self._late_result(key, context, action, data, error),
                    name="Occupied late service result",
                ),
            )
        except ServiceWaitTimeout as err:
            self.last_error = f"{action.action} for {', '.join(action.targets)}: {err}"
            self._finish(key, "uncertain", action, self.last_error)
            await self._persist()
            return False
        except Exception as err:
            for entity in action.targets:
                self._motions.pop(entity, None)
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
        async_log_action(self, action.action, action.targets, data, context)
        for entity in action.targets:
            if (
                entity.startswith(("light.", "switch."))
                and entity not in self._yielded
                and self.run_condition_status()[0]
                and (cleanup or generation == self.generation)
            ):
                if value := self._observe(entity):
                    self._owned[entity] = value
        self._finish(key, "dispatched", action)
        await self._persist()
        return True

    async def _late_result(self, key, context, action, data, error):
        async with self._lock:
            entry = self._journal.get(key)
            if (
                self.closed
                or not entry
                or entry.get("status") != "uncertain"
                or entry.get("context") != context.id
                or entry.get("revision") != revision(self.program)
            ):
                return
            detail = (
                f"{type(error).__name__}: {error}"
                if error is not None
                else "Completed after Occupied stopped waiting"
            )
            entry["late_result"] = True
            self._finish(key, "failed" if error is not None else "dispatched", action, detail)
            if error is None:
                async_log_action(self, action.action, action.targets, data, context)
            await self._persist()
            self._notify()

    def _finish(self, key, outcome, action=None, detail=""):
        entry = self._journal.setdefault(key, {"date": dt_util.utcnow().date().isoformat()})
        entry.update(status=outcome, time=dt_util.utcnow().isoformat())
        if action:
            entry["observed"] = {
                entity: self._observe(entity)
                for entity in set(action.resources) | set(action.targets)
            }
        self._record(key, outcome, detail or (action.action if action else ""))

    async def _execute_custom_group(self, plan, event, generation):
        group = plan.groups[event.group_id]
        # A handover may have deferred an earlier execution group. Keep authored
        # list order even while unrelated work and later ticks remain queued.
        unfinished = {
            self._key(plan, member)
            for member in plan.occurrences[event.occurrence_id]
            if member.at < event.at and self._key(plan, member) not in self._journal
        }
        if unfinished:
            queued = [member.at for member in self._queue if member.key in unfinished]
            if queued:
                self._push(
                    max(max(queued), dt_util.utcnow()) + timedelta(microseconds=1),
                    "plan",
                    self._key(plan, event),
                    (plan, event),
                    event.order_key[1:],
                )
                return
        conflicts = {
            entity
            for member in group
            if member.action.action not in {"light.turn_on", "light.turn_off"}
            for entity in member.action.targets
            if entity in self._handover
        }
        if conflicts:
            at = max(instant(self._handover[e]["deadline"]) for e in conflicts)
            self._push(at, "plan", self._key(plan, event), (plan, event), event.order_key[1:])
            return
        failure_statuses = {
            "failed",
            "uncertain",
            "pending",
            "blocked",
            "cancelled_before_dispatch",
        }
        stopped = (
            "Earlier call failed or was interrupted; block is not replayed"
            if any(
                self._journal.get(self._key(plan, member), {}).get("status") in failure_statuses
                for member in plan.occurrences[event.occurrence_id]
            )
            else None
        )
        for member in group:
            key = self._key(plan, member)
            previous = self._journal.get(key, {}).get("status")
            if previous:
                if previous in {
                    "failed",
                    "uncertain",
                    "pending",
                    "blocked",
                    "cancelled_before_dispatch",
                }:
                    stopped = "Earlier call failed or was interrupted; block is not replayed"
                continue
            if stopped:
                self._finish(key, "blocked", member.action, stopped)
                continue
            if generation != self.generation or not self._effective_gate()[0]:
                stopped = "Permission changed or controller stopped"
                self._finish(key, "blocked", member.action, stopped)
                continue
            if member.superseded:
                self._finish(key, "superseded", member.action)
                continue
            # A new scheduled intent takes control again; retries and handover
            # keep respecting outside changes made after that intent began.
            self._yielded.difference_update(member.action.targets)
            if member.action.action in {"light.turn_on", "light.turn_off"} and any(
                entity in self._handover for entity in member.action.targets
            ):
                self._finish(key, "subsumed_handover", member.action)
                continue
            success = await self._call(member.action, key, generation, allow_retry=False)
            status = self._journal.get(key, {}).get("status")
            if not success and status not in {"entity_disabled", "unavailable", "yielded"}:
                stopped = (
                    "Earlier call failed or was interrupted; remaining calls were not dispatched"
                )
        if stopped:
            for member in plan.occurrences[event.occurrence_id]:
                key = self._key(plan, member)
                if key not in self._journal:
                    self._finish(key, "blocked", member.action, stopped)
        await self._persist()

    async def _execute_plan(self, plan, event: PlanEvent, key, generation):
        if key in self._journal:
            return
        if event.superseded:
            self._finish(key, "superseded", event.action)
            return
        if event.custom:
            await self._execute_custom_group(plan, event, generation)
            return
        action = event.action
        if generation != self.generation or not self._effective_gate()[0]:
            return
        self._yielded.difference_update(action.targets)
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

    async def _cancel_native_fades(self, entities=None, *, generation=None):
        for entity in set(self._native_fades):
            if entities is not None and entity not in entities:
                continue
            self._native_fades.discard(entity)
            if entity in self._yielded or entity not in self._owned:
                continue
            current = light_observation(self.hass, entity)
            if current is None:
                continue
            data = {"transition": 0}
            if current.state == "on" and current.brightness_pct is not None:
                data["brightness"] = max(1, round(current.brightness_pct * 255 / 100))
            action = ResolvedAction(f"light.turn_{current.state}", (entity,), data, (entity,), True)
            # Hold only the controller's still-owned transition at its observed level.
            await self._call(
                action,
                f"cancel_fade:{self.session}:{entity}:{secrets.token_hex(4)}",
                generation,
                cleanup=generation is None,
            )

    async def _stop_owned(self):
        if self.run_condition_status()[0]:
            await self._cancel_native_fades()
        self._forget_owned()

    async def async_replace_program(self, program, *, expected_revision=None, persist_program=True):
        gate = ActivationGate.for_run_condition(self.hass, program.run_condition)
        await gate.async_prepare()
        now = dt_util.utcnow()
        latches = AnchorLatches()
        latches.restore(self._anchor_latches.snapshot())
        context = latches.apply(program, planning_context(self.hass, source_entities(program)), now)
        today = simulation_date_at(program, now, context)
        plans = await self.hass.async_add_executor_job(
            partial(
                preview_dates,
                program,
                runtime_dates(program, today),
                self._seed,
                context=context,
            )
        )
        if any(not plan.feasible for plan in plans):
            raise ProgramError(
                [issue for plan in plans for issue in plan.issues if issue.severity == "error"]
            )
        async with self._lock:
            if self.closed:
                raise HomeAssistantError(
                    "Occupied is unloaded; refresh before saving",
                    translation_domain=DOMAIN,
                    translation_key="unloaded_before_save",
                )
            if expected_revision is not None and expected_revision != self.source_revision:
                raise RevisionConflict(
                    "The program changed. Reload the saved program before saving."
                )
            if persist_program:
                await program_store(self.hass, self.entry_id).async_save(program_data(program))
            was_ready = self.configuration_ready
            self.configuration_ready = True
            same_schedule = behavior_hash(program) == behavior_hash(self.program)
            same_policy = program.run_condition == self.program.run_condition
            if same_schedule and same_policy:
                self.program = program
                self.config["name"] = program.name
                if self.source_manager:
                    self.source_manager.clear_recovery()
                if not was_ready and self.started:
                    await self._reevaluate_locked()
                else:
                    await self._persist()
                    self._notify()
                return
            self._invalidate(preserve_activation=same_policy)
            if self.started:
                await self._cancel_native_fades()
            self.program, self.gate = program, gate
            if self.source_manager:
                self.source_manager.clear_recovery()
            self.enforce_state_on_start = bool(
                program.run_condition and program.run_condition.enforce_state_on_start
            )
            self.config["name"] = program.name
            if not same_schedule:
                self._plans.clear()
            self._handover.clear()
            if self.started:
                self._restoring = same_policy
                self._listen_states()
                await self._reevaluate_locked()
            else:
                await self._persist()
                self._notify()

    def _record(self, key, outcome, detail):
        if outcome in {"failed", "invalid_plan", "plan_version_changed"}:
            level = logging.INFO if outcome == "plan_version_changed" else logging.ERROR
            _LOGGER.log(
                level,
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
            "random_window_skipped",
            "uncertain",
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
            "enforce_state_on_start": self.enforce_state_on_start,
            "paused": self.paused,
            "live_preview": self.live_preview.snapshot(),
            "active": self.active,
            "status": self.status,
            "reason": self.reason,
            "session": self.session,
            "next_event": self.next_event.isoformat() if self.next_event else None,
            "handover_deadline": self.handover_deadline.isoformat()
            if self.handover_deadline
            else None,
            "handover": handover,
            "run_condition": self._run_condition_snapshot(now),
            "reconciliation": self._reconciliation_snapshot(),
            "yielded": sorted(self._yielded),
            "last_error": self.last_error,
            "source_revision": self.source_revision,
            "behavior_hash": behavior_hash(self.program),
            "journal_count": len(self._journal),
            "outcomes": list(self.outcomes),
            "events": [
                {"time": e.at.isoformat(), "event": e.kind, "id": e.key}
                for e in sorted(self._queue)
            ],
        }

    def _reconciliation_snapshot(self):
        result = deepcopy(self.reconciliation)
        statuses = [entry["status"] for entry in result["results"].values()]
        applied = statuses.count("dispatched")
        matching = statuses.count("already_matching")
        failed = sum(
            status in {"failed", "uncertain", "cancelled_before_dispatch"} for status in statuses
        )
        skipped = len(statuses) - applied - matching - failed
        result["counts"] = {
            "checked": len(statuses),
            "applied": applied,
            "already_matching": matching,
            "failed": failed,
            "skipped": skipped,
        }
        return result

    def _run_condition_snapshot(self, now):
        config = self.program.run_condition
        if config is None:
            return None
        state = self.hass.states.get(config.entity_id)
        return self._run_condition_data() | {
            "current_state": state.state if state else None,
            "matches": self.run_condition_status()[0],
            "activation_deadline": self.activation_deadline.isoformat()
            if self.activation_deadline
            else None,
            "remaining_seconds": max(0, (self.activation_deadline - now).total_seconds())
            if self.activation_deadline
            else None,
        }

    async def async_close(self, *, cleanup=True):
        if self.closed:
            return
        was_active = self.active
        self.live_preview.invalidate("Integration unloaded", interrupted=True)
        self.closed = True
        self._invalidate()
        if self._state_unsub:
            self._state_unsub()
            self._state_unsub = None
        if self._stop_unsub:
            self._stop_unsub()
            self._stop_unsub = None
        for unsubscribe in self._unsubs:
            unsubscribe()
        self._unsubs.clear()
        async with self._lock:
            await self.live_preview.finish_stop_locked()
            if cleanup:
                await self._stop_owned()
            # Shutdown preserves active-session continuity and lifecycle snapshots.
            self.active = was_active if not cleanup else False
            await self._persist()
            self.active = False
            self.reason = "Integration unloaded"
            self._notify()
