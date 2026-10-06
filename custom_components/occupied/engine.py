"""HA-owned timers for milestone one's deterministic activation-session proof."""

import asyncio
import heapq
import logging
import math
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from homeassistant.const import (
    EVENT_HOMEASSISTANT_STARTED,
    EVENT_HOMEASSISTANT_STOP,
    STATE_OFF,
    STATE_ON,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import Context, Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import (
    async_track_point_in_utc_time,
    async_track_state_change_event,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .activation import ActivationGate
from .const import (
    CONF_ACTIVATION_ENTITY,
    CONF_ACTIVITY,
    CONF_ALLOWED_STATES,
    CONF_BRIGHTNESS,
    CONF_HANDOVER,
    CONF_LIGHT,
    CONF_LIGHT_DELAY,
    CONF_LIGHT_DURATION,
    CONF_REMOTE,
    CONF_REMOTE_DELAY,
    CONF_REMOTE_DURATION,
    DOMAIN,
    SIGNAL_PREFIX,
)

_LOGGER = logging.getLogger(__name__)
STEP_SECONDS = 30
SERVICE_TIMEOUT = 10


@dataclass(order=True)
class ScheduledEvent:
    """Absolute UTC event; insertion order breaks same-time ties."""

    at: datetime
    sequence: int
    kind: str = field(compare=False)
    brightness: int | None = field(default=None, compare=False)


class OccupiedEngine:
    """Keep permission separate from the gate and serialize all device dispatch."""

    def __init__(self, hass: HomeAssistant, entry_id: str, config: dict[str, Any]) -> None:
        self.hass = hass
        self.entry_id = entry_id
        self.config = config
        conditions = []
        if entity_id := config.get(CONF_ACTIVATION_ENTITY):
            conditions = [
                {"condition": "state", "entity_id": entity_id, "state": config[CONF_ALLOWED_STATES]}
            ]
        self.gate = ActivationGate(hass, conditions)
        self.signal = f"{SIGNAL_PREFIX}_{entry_id}"
        self.enabled = False
        self.paused = False
        self.active = False
        self.started = False
        self.closed = False
        self.status = "disabled"
        self.reason = "Permission is disabled"
        self.session = 0
        self.generation = 0
        self.handover_deadline: datetime | None = None
        self.handover_start_brightness: int | None = None
        self.light_yielded = False
        self.remote_owned = False
        self.remote_deadline: datetime | None = None
        self.last_error: str | None = None
        self.outcomes: deque[dict[str, Any]] = deque(maxlen=20)
        self._store = Store(hass, 1, f"{DOMAIN}.{entry_id}.permission")
        self._queue: list[ScheduledEvent] = []
        self._sequence = 0
        self._cancel_timer: Callable[[], None] | None = None
        self._unsubs: list[Callable[[], None]] = []
        self._contexts: deque[str] = deque(maxlen=100)
        self._lock = asyncio.Lock()

    @property
    def next_event(self) -> datetime | None:
        return self._queue[0].at if self._queue else None

    async def async_prepare(self) -> None:
        """Restore permission; do not execute anything before HA finishes startup."""
        await self.gate.async_prepare()
        saved = await self._store.async_load() or {}
        self.enabled = saved.get("enabled", False)
        self.paused = saved.get("paused", False)

    async def async_start(self) -> None:
        """Subscribe independently of any browser or panel connection."""
        if self.gate.entities:
            self._unsubs.append(
                async_track_state_change_event(
                    self.hass, self.gate.entities, self._activation_changed
                )
            )
        observed = [self.config[CONF_LIGHT]]
        if remote := self.config.get(CONF_REMOTE):
            observed.append(remote)
        self._unsubs.append(
            async_track_state_change_event(self.hass, observed, self._target_changed)
        )
        self._unsubs.append(
            self.hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, self._async_shutdown)
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

    async def _async_started(self, _: Event) -> None:
        self.started = True
        await self.async_reevaluate()

    async def _async_shutdown(self, _: Event) -> None:
        # Device services may already be unavailable at shutdown. Persisted
        # activity recovery is milestone 3; entry unload does explicit cleanup.
        await self.async_close(cleanup=False)

    def _effective_gate(self) -> tuple[bool, str]:
        if self.closed:
            return False, "Integration unloaded"
        if not self.started:
            return False, "Waiting for Home Assistant startup"
        if not self.enabled:
            return False, "Permission is disabled"
        if self.paused:
            return False, "Simulation is paused"
        return self.gate.evaluate()

    @callback
    def _activation_changed(self, _: Event) -> None:
        if not self._effective_gate()[0]:
            self._invalidate()
        self.hass.async_create_task(self.async_reevaluate())

    @callback
    def _target_changed(self, event: Event) -> None:
        if not self.active:
            return
        if event.context.id in self._contexts or event.context.parent_id in self._contexts:
            return
        entity_id = event.data["entity_id"]
        if entity_id == self.config.get(CONF_REMOTE) and self.remote_owned:
            self.remote_owned = False
            self.remote_deadline = None
            self._queue = [item for item in self._queue if item.kind != "remote_end"]
            heapq.heapify(self._queue)
            self._record("remote_end", "yielded", "Remote changed outside Occupied")
            self._arm_timer()
        elif entity_id == self.config[CONF_LIGHT]:
            self.light_yielded = True
            self._record("light", "yielded", "Light changed outside Occupied")
        self._notify()

    @callback
    def _invalidate(self) -> None:
        """Invalidate queued/running generations immediately, before awaiting the lock."""
        self.generation += 1
        self.active = False
        self._queue.clear()
        self.handover_deadline = None
        if self._cancel_timer is not None:
            self._cancel_timer()
            self._cancel_timer = None

    async def async_set_enabled(self, enabled: bool) -> None:
        self.enabled = enabled
        if not enabled:
            self._invalidate()
        async with self._lock:
            await self._store.async_save({"enabled": self.enabled, "paused": self.paused})
            await self._reevaluate_locked()

    async def async_set_paused(self, paused: bool) -> None:
        self.paused = paused
        if paused:
            self._invalidate()
        async with self._lock:
            await self._store.async_save({"enabled": self.enabled, "paused": self.paused})
            await self._reevaluate_locked()

    async def async_reevaluate(self) -> None:
        async with self._lock:
            await self._reevaluate_locked()

    async def _reevaluate_locked(self) -> None:
        passed, reason = self._effective_gate()
        if not passed:
            self._invalidate()
            await self._end_remote()
            self.status = (
                "disabled"
                if not self.enabled
                else "paused"
                if self.paused
                else "waiting"
                if not self.started
                else "inactive"
            )
            self.reason = reason
        elif not self.active:
            self._begin_session()
        self._notify()

    def _enqueue(self, at: datetime, kind: str, brightness: int | None = None) -> None:
        self._sequence += 1
        heapq.heappush(self._queue, ScheduledEvent(at, self._sequence, kind, brightness))

    def _begin_session(self) -> None:
        self.active = True
        self.session += 1
        self.generation += 1
        self.light_yielded = False
        self.last_error = None
        now = dt_util.utcnow()
        duration = self.config[CONF_HANDOVER]
        endpoint = now + timedelta(seconds=duration)
        self.handover_deadline = endpoint
        self.status = "transitioning" if duration else "active"
        self.reason = (
            "Converging observed lighting" if duration else "Executing caller-proof schedule"
        )
        light = self.hass.states.get(self.config[CONF_LIGHT])
        target = round(255 * self.config[CONF_BRIGHTNESS] / 100)
        self.handover_start_brightness = None
        if light is not None and light.state in {STATE_ON, STATE_OFF}:
            start = int(light.attributes.get("brightness", 255)) if light.state == STATE_ON else 0
            self.handover_start_brightness = start
            modes = set(light.attributes.get("supported_color_modes", []))
            dimmable = bool(modes - {"onoff", "unknown"})
            if dimmable and start != target:
                count = max(1, math.ceil(duration / STEP_SECONDS))
                for index in range(1, count + 1):
                    level = round(start + (target - start) * index / count)
                    self._enqueue(
                        now + timedelta(seconds=duration * index / count), "handover", max(1, level)
                    )
            elif light.state == STATE_OFF:
                self._enqueue(endpoint, "handover")
        else:
            self._record("handover", "skipped", "Light is missing, unknown, or unavailable")
        self._enqueue(endpoint, "handover_complete")
        light_on = endpoint + timedelta(seconds=self.config[CONF_LIGHT_DELAY])
        self._enqueue(light_on, "light_on", target)
        self._enqueue(light_on + timedelta(seconds=self.config[CONF_LIGHT_DURATION]), "light_off")
        if self.config.get(CONF_REMOTE):
            self._enqueue(
                endpoint + timedelta(seconds=self.config[CONF_REMOTE_DELAY]), "remote_start"
            )
        self._arm_timer()

    @callback
    def _arm_timer(self) -> None:
        if self._cancel_timer is not None:
            self._cancel_timer()
            self._cancel_timer = None
        if not self.active or not self._queue:
            return
        generation = self.generation

        @callback
        def due(_: datetime) -> None:
            if generation == self.generation and self.active:
                self._cancel_timer = None
                self.hass.async_create_task(self._async_dispatch(generation))

        self._cancel_timer = async_track_point_in_utc_time(self.hass, due, self._queue[0].at)

    async def _async_dispatch(self, generation: int) -> None:
        async with self._lock:
            while self._queue and self._queue[0].at <= dt_util.utcnow():
                if generation != self.generation or not self._effective_gate()[0]:
                    await self._reevaluate_locked()
                    return
                event = heapq.heappop(self._queue)
                await self._execute(event, generation)
            if generation != self.generation:
                return
            if self.active and not self._queue:
                self.status, self.reason = (
                    "complete",
                    "Caller-proof schedule completed; waiting for next activation",
                )
            self._arm_timer()
            self._notify()

    async def _execute(self, event: ScheduledEvent, generation: int) -> None:
        if event.kind == "handover_complete":
            self.handover_deadline = None
            self.status, self.reason = "active", "Executing caller-proof schedule"
        elif event.kind in {"handover", "light_on", "light_off"}:
            entity_id = self.config[CONF_LIGHT]
            if self.light_yielded:
                self._record(event.kind, "skipped", "Light yielded to outside control")
                return
            state = self.hass.states.get(entity_id)
            if state is None or state.state in {STATE_UNKNOWN, STATE_UNAVAILABLE}:
                self._record(event.kind, "skipped", "Light is unavailable")
                return
            service = "turn_off" if event.kind == "light_off" else "turn_on"
            data: dict[str, Any] = {"entity_id": entity_id}
            if event.brightness is not None and set(
                state.attributes.get("supported_color_modes", [])
            ) - {"onoff", "unknown"}:
                data["brightness"] = event.brightness
                data["transition"] = 0
            await self._call("light", service, data, event.kind, generation)
        elif event.kind == "remote_start":
            entity_id = self.config[CONF_REMOTE]
            state = self.hass.states.get(entity_id)
            if state is None or state.state != STATE_OFF:
                self._record(event.kind, "skipped", "Remote is already in use or unavailable")
                return
            if await self._call(
                "remote",
                "turn_on",
                {"entity_id": entity_id, "activity": self.config[CONF_ACTIVITY]},
                event.kind,
                generation,
            ):
                self.remote_owned = True
                self.remote_deadline = dt_util.utcnow() + timedelta(
                    seconds=self.config[CONF_REMOTE_DURATION]
                )
                if generation == self.generation and self._effective_gate()[0]:
                    self._enqueue(self.remote_deadline, "remote_end")
                else:
                    await self._end_remote()
        elif event.kind == "remote_end":
            await self._end_remote()

    async def _call(
        self, domain: str, service: str, data: dict[str, Any], kind: str, generation: int | None
    ) -> bool:
        if generation is not None and (
            generation != self.generation or not self._effective_gate()[0]
        ):
            return False
        context = Context()
        self._contexts.append(context.id)
        try:
            async with asyncio.timeout(SERVICE_TIMEOUT):
                await self.hass.services.async_call(
                    domain, service, data, blocking=True, context=context
                )
        except (HomeAssistantError, TimeoutError) as err:
            self.last_error = f"{domain}.{service}: {err}"
            self._record(kind, "failed", self.last_error)
            _LOGGER.warning("Occupied dispatch failed: %s", self.last_error)
            return False
        self._record(kind, "dispatched", f"{domain}.{service}")
        return True

    async def _end_remote(self) -> None:
        """Explicit owned cleanup is allowed after the activation gate closes."""
        if not self.remote_owned:
            return
        self.remote_owned = False
        self.remote_deadline = None
        state = self.hass.states.get(self.config[CONF_REMOTE])
        if (
            state is None
            or state.state != STATE_ON
            or state.attributes.get("current_activity") != self.config[CONF_ACTIVITY]
        ):
            self._record("remote_end", "skipped", "Remote ownership cannot be confirmed")
            return
        await self._call(
            "remote", "turn_off", {"entity_id": self.config[CONF_REMOTE]}, "remote_end", None
        )

    def _record(self, kind: str, outcome: str, detail: str) -> None:
        self.outcomes.append(
            {
                "time": dt_util.utcnow().isoformat(),
                "event": kind,
                "outcome": outcome,
                "detail": detail,
            }
        )

    @callback
    def _notify(self) -> None:
        async_dispatcher_send(self.hass, self.signal)

    def snapshot(self) -> dict[str, Any]:
        """Compact authenticated panel status; the panel is never the caller."""
        return {
            "config_entry_id": self.entry_id,
            "name": self.config["name"],
            "enabled": self.enabled,
            "paused": self.paused,
            "active": self.active,
            "status": self.status,
            "reason": self.reason,
            "session": self.session,
            "next_event": self.next_event.isoformat() if self.next_event else None,
            "handover_deadline": self.handover_deadline.isoformat()
            if self.handover_deadline
            else None,
            "handover_start_brightness": self.handover_start_brightness,
            "target_brightness_pct": self.config[CONF_BRIGHTNESS],
            "remote_owned": self.remote_owned,
            "remote_deadline": self.remote_deadline.isoformat() if self.remote_deadline else None,
            "last_error": self.last_error,
            "outcomes": list(self.outcomes),
            "events": [
                {"time": item.at.isoformat(), "event": item.kind} for item in sorted(self._queue)
            ],
        }

    async def async_close(self, *, cleanup: bool = True) -> None:
        self.closed = True
        self._invalidate()
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        async with self._lock:
            if cleanup:
                await self._end_remote()
            self.status, self.reason = "inactive", "Integration unloaded"
            self._notify()
