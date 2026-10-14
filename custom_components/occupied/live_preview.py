"""Explicit, durable manual device dispatch, isolated from ordinary scheduling."""

import asyncio
import secrets
from copy import deepcopy
from datetime import date
from functools import partial

from homeassistant.core import Context
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er

from .actions import dispatch_service, observe
from .const import DOMAIN
from .file_config import load_program
from .instances import controlled_entities
from .planner import occurrence_groups
from .preview import planning_identity, preview_draft
from .runtime_planning import MAX_EVENTS
from .storage import DurableStore, plan_from_data
from .time_sources import planning_context
from .validation import program_data, program_revision

RUNNING = {"ready", "executing", "stopping"}
MAX_START_REQUESTS = 1024


class LivePreviewError(HomeAssistantError):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


class LivePreviewManager:
    """All cursor and journal writes use the controller lock; cancellation does not."""

    def __init__(self, engine):
        self.engine, self.hass = engine, engine.hass
        self.store = DurableStore(
            self.hass, 1, f"{DOMAIN}.{engine.entry_id}.live_preview", atomic_writes=True
        )
        self.session = None
        self.program = self.plan = None
        self.groups = ()
        self.generation = 0
        self.requests = {}
        self.starts = {}
        self.storage_failed = False

    @property
    def running(self):
        return bool(self.session and self.session["state"] in RUNNING)

    @property
    def targets(self):
        return {
            entity for group in self.groups for event in group for entity in event.action.targets
        }

    def snapshot(self, *, all_outcomes=False):
        if not self.session:
            return None
        result = {key: value for key, value in self.session.items() if key != "outcomes"}
        result["outcomes"] = self.session["outcomes"]
        if not all_outcomes:
            visible = {result["last_group_id"]}
            if result["state"] == "executing" and result["next_group"]:
                visible.add(result["next_group"]["id"])
            result["outcomes"] = {
                key: value
                for key, value in result["outcomes"].items()
                if value["group_id"] in visible
            }
        result = deepcopy(result)
        result["paused"] = self.engine.paused
        result["earlier_revision"] = bool(
            self.program
            and hasattr(self.engine, "program")
            and program_revision(self.engine.program) != result.get("controller_revision")
        )
        result["storage_failed"] = self.storage_failed or getattr(
            self.engine, "_storage_failed", False
        )
        return result

    def response(self, user_id, *, frozen=False):
        result = {"session": self.snapshot(all_outcomes=frozen), "can_advance": False}
        if self.session:
            result["can_advance"] = self.session["user_id"] == user_id
        if frozen and self.plan:
            result.update(program=program_data(self.program), plan=self.plan.to_dict())
        return result

    async def async_prepare(self):
        saved = await self.store.async_load() or {}
        self.starts = saved.get("starts", {})
        self.session = saved.get("session")
        self.requests = saved.get("requests", {})
        if not self.session:
            return
        try:
            self.program = load_program(saved["program"])
            self.plan = plan_from_data(saved["plan"])
            self.groups = occurrence_groups(self.plan)
        except (ValueError, KeyError, TypeError) as err:
            self.session["state"] = "interrupted"
            self.session["detail"] = f"Cannot recover frozen schedule: {err}"
        if self.session["state"] in RUNNING:
            self.session["state"] = "interrupted"
            self.session["detail"] = "Preview interrupted by restart; start a new session"
        for outcome in self.session["outcomes"].values():
            if outcome["status"] == "pending":
                outcome.update(status="uncertain", detail="Interrupted call is never replayed")
        # Permission was durably paused before accepting Start. Its separately
        # restored value also records a later explicit Resume; never overwrite it.
        await self._persist()

    def invalidate(self, detail="Preview stopped", *, interrupted=False):
        """Synchronous: Stop takes effect before a service handler releases the lock."""
        self.generation += 1
        if self.running:
            self.session.update(state="interrupted" if interrupted else "stopping", detail=detail)
            self.engine._notify()

    async def finish_stop_locked(self):
        if self.session and self.session["state"] == "stopping":
            self.session["state"] = "stopped"
        if self.session:
            self.session["in_flight"] = None
            await self._persist()
            self.engine._notify()

    async def async_stop(self, session_id):
        if not self.session or self.session["id"] != session_id:
            raise LivePreviewError("session_conflict", "Live preview session changed")
        self.invalidate()
        async with self.engine._lock:
            await self.finish_stop_locked()

    async def _save_pause(self):
        if hasattr(self.engine, "_save_permission"):
            await self.engine._save_permission()
        else:
            await self.engine._store.async_save(
                {"enabled": self.engine.enabled, "paused": self.engine.paused}
            )

    async def _persist(self):
        try:
            await self.store.async_save(
                deepcopy(
                    {
                        "session": self.session,
                        "program": program_data(self.program) if self.program else None,
                        "plan": self.plan.to_dict() if self.plan else None,
                        "requests": self.requests,
                        "starts": self.starts,
                    }
                )
            )
        except HomeAssistantError as err:
            self.storage_failed = True
            self.invalidate(f"Live preview persistence failed: {err}", interrupted=True)
            return False
        return True

    def _available(self):
        if (
            self.engine.closed
            or not getattr(self.engine, "configuration_ready", True)
            or getattr(self.engine, "_storage_failed", False)
            or self.storage_failed
        ):
            self.invalidate(
                "Controller configuration or persistence is unavailable", interrupted=True
            )
            raise LivePreviewError(
                "preview_unavailable", "Controller configuration or persistence is unavailable"
            )

    def _check_overlap(self, targets):
        for entry in self.hass.config_entries.async_entries(DOMAIN):
            other = getattr(entry, "runtime_data", None)
            if other is None or other is self.engine or other.closed:
                continue
            live = other.live_preview
            declared = controlled_entities(other) if other.active else set()
            if live.running:
                declared |= live.targets
            shared = targets & declared
            if shared:
                raise LivePreviewError(
                    "target_conflict",
                    f"Pause {other.config['name']} ({other.entry_id}); "
                    f"overlapping entities: {', '.join(sorted(shared))}",
                )

    async def async_start(self, source, day, seed, fingerprint, request_id, user_id):
        # Serialize starts across controllers so overlapping sessions cannot both win.
        lock = self.hass.data.setdefault(DOMAIN, {}).setdefault("live_start_lock", asyncio.Lock())
        request_key = f"{user_id}:{request_id}"
        generation = self.generation
        async with lock:
            if request_key in self.starts:
                previous = self.starts[request_key]
                if self.session and previous == self.session["id"]:
                    return self.response(user_id, frozen=True)
                raise LivePreviewError(
                    "request_consumed", "Start request already created a session"
                )
            self._available()
            if self.running:
                raise LivePreviewError("session_conflict", "A live preview is already running")
            if len(self.starts) >= MAX_START_REQUESTS:
                raise LivePreviewError("request_budget", "Live preview start journal is full")
            context = planning_context(self.hass)
            program = await self.hass.async_add_executor_job(load_program, source)
            preview = await self.hass.async_add_executor_job(
                partial(preview_draft, source, date.fromisoformat(day), 1, seed, context)
            )
            if preview["plan_fingerprint"] != fingerprint:
                raise LivePreviewError("schedule_changed", "Schedule changed; refresh Preview")
            plan = plan_from_data(preview["plans"][0])
            if not plan.feasible or not plan.events or len(plan.events) > MAX_EVENTS:
                raise LivePreviewError("empty_schedule", "Choose a nonempty, feasible preview day")
            async with self.engine._lock:
                self._available()
                if generation != self.generation:
                    raise LivePreviewError(
                        "session_conflict", "Start cancelled by controller control"
                    )
                if planning_identity(program, context) != planning_identity(
                    program, planning_context(self.hass)
                ):
                    raise LivePreviewError("schedule_changed", "Schedule changed; refresh Preview")
                self._check_overlap({e for event in plan.events for e in event.action.targets})
                self.program, self.plan, self.groups = program, plan, occurrence_groups(plan)
                self.requests = {}
                self.session = {
                    "id": secrets.token_hex(16),
                    "user_id": user_id,
                    "state": "ready",
                    "date": day,
                    "source_revision": plan.source_revision,
                    "controller_revision": program_revision(self.engine.program)
                    if hasattr(self.engine, "program")
                    else None,
                    "plan_fingerprint": fingerprint,
                    "cursor": 0,
                    "total": len(self.groups),
                    "simulated_time": None,
                    "in_flight": None,
                    "detail": "Ready to start",
                    "outcomes": {},
                    "last_group_id": None,
                    "next_group": self._group_document(self.groups[0]),
                }
                self.starts[request_key] = self.session["id"]
                self.engine.paused = True
                self.engine._invalidate()
                try:
                    await self._save_pause()
                    await self.engine._reevaluate_locked()
                except HomeAssistantError as err:
                    self.invalidate(f"Cannot persist controller pause: {err}", interrupted=True)
                if getattr(self.engine, "_storage_failed", False):
                    self.invalidate("Controller persistence failed", interrupted=True)
                if generation != self.generation and self.session["state"] == "stopping":
                    self.session["state"] = "stopped"
                if not await self._persist():
                    raise LivePreviewError("storage_failed", "Cannot persist live preview session")
                self.engine._notify()
                return self.response(user_id, frozen=True)

    def _group_document(self, group):
        first = group[0]
        resource = (
            self.program.random[first.source_id]
            if first.kind.startswith("random_")
            else self.program.steps[first.source_id]
        )
        return {
            "id": first.group_id,
            "time": first.at.isoformat(),
            "title": resource.name or first.source_id,
            "kind": first.kind,
            "calls": [event.to_dict() for event in group],
        }

    def _call_problem(self, action):
        registry = er.async_get(self.hass)
        disabled = [
            entity
            for entity in action.targets
            if (entry := registry.async_get(entity)) and entry.disabled_by
        ]
        if disabled:
            return "entity_disabled", f"Disabled entities: {', '.join(disabled)}"
        unavailable = [entity for entity in action.targets if observe(self.hass, entity) is None]
        if unavailable:
            return "unavailable", f"Unavailable entities: {', '.join(unavailable)}"
        domain, service = action.action.split(".")
        if not self.hass.services.has_service(domain, service):
            return "service_missing", f"Service {action.action} is not registered"
        return None

    async def async_next(self, session_id, expected_group_id, request_id, user_id):
        async with self.engine._lock:
            if not self.session or self.session["id"] != session_id:
                raise LivePreviewError("session_conflict", "Live preview session changed")
            if self.session["user_id"] != user_id:
                raise LivePreviewError("unauthorized", "Only the session owner can advance")
            if request_id in self.requests:
                cached = self.requests[request_id]
                if cached["group_id"] != expected_group_id:
                    raise LivePreviewError(
                        "request_conflict", "Request ID belongs to another event"
                    )
                return {
                    **self.response(user_id),
                    "call_outcomes": deepcopy(cached["outcomes"]),
                }
            self._available()
            if self.session["state"] != "ready":
                raise LivePreviewError("session_conflict", "Live preview is not ready to advance")
            group = self.groups[self.session["cursor"]]
            if group[0].group_id != expected_group_id:
                raise LivePreviewError(
                    "group_conflict", "Event changed; retrieve live preview status"
                )
            self._check_overlap(self.targets)
            generation = self.generation
            self.session.update(state="executing", in_flight=request_id, detail="Running…")
            self.engine._notify()
            for event in group:
                if generation != self.generation:
                    break
                try:
                    self._available()
                    self._check_overlap(self.targets)
                except LivePreviewError as err:
                    self.invalidate(str(err), interrupted=True)
                    break
                problem = self._call_problem(event.action)
                outcome = {
                    "group_id": event.group_id,
                    "status": problem[0] if problem else "pending",
                    "detail": problem[1] if problem else "Awaiting service handler",
                    "action": event.action.to_dict(),
                }
                self.session["outcomes"][event.id] = outcome
                context = Context(user_id=user_id)
                outcome["context_id"] = context.id
                if not await self._persist():
                    outcome.update(
                        status="cancelled", detail="Journal write failed; not dispatched"
                    )
                    break
                if generation != self.generation:
                    outcome.update(status="cancelled", detail="Stopped before dispatch")
                    break
                try:
                    self._available()
                    self._check_overlap(self.targets)
                except LivePreviewError as err:
                    outcome.update(status="cancelled", detail=str(err))
                    self.invalidate(str(err), interrupted=True)
                    break
                if not problem:
                    try:
                        await dispatch_service(self.hass, event.action, context)
                        outcome.update(status="dispatched", detail="Service handler completed")
                    except TimeoutError:
                        outcome.update(status="uncertain", detail="Service timed out; not retried")
                    except asyncio.CancelledError:
                        outcome.update(
                            status="uncertain", detail="Dispatch interrupted; not replayed"
                        )
                        self.invalidate("Dispatch interrupted", interrupted=True)
                        await self._persist()
                        raise
                    except Exception as err:
                        outcome.update(status="failed", detail=f"{type(err).__name__}: {err}")
                if not await self._persist():
                    break
                if event.custom and outcome["status"] in {"failed", "uncertain", "service_missing"}:
                    break
            # Include undispatched members so partial completion cannot look like success.
            for event in group:
                self.session["outcomes"].setdefault(
                    event.id,
                    {
                        "group_id": event.group_id,
                        "status": "cancelled",
                        "detail": "Not dispatched",
                        "action": event.action.to_dict(),
                    },
                )
            self.session.update(
                cursor=self.session["cursor"] + 1,
                simulated_time=group[0].at.isoformat(),
                last_group_id=group[0].group_id,
                in_flight=None,
            )
            if self.session["state"] == "executing":
                complete = self.session["cursor"] == len(self.groups)
                self.session.update(
                    state="completed" if complete else "ready",
                    detail="Day complete" if complete else "Ready for next event",
                )
            elif self.session["state"] == "stopping":
                self.session["state"] = "stopped"
            self.session["next_group"] = (
                self._group_document(self.groups[self.session["cursor"]])
                if self.session["cursor"] < len(self.groups)
                else None
            )
            call_outcomes = {
                event.id: deepcopy(self.session["outcomes"][event.id]) for event in group
            }
            self.requests[request_id] = {"group_id": expected_group_id, "outcomes": call_outcomes}
            await self._persist()
            self.engine._notify()
            return {**self.response(user_id), "call_outcomes": call_outcomes}
