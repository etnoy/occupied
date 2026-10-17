"""Queued configuration work cannot act after an engine has closed."""

import asyncio
from unittest.mock import AsyncMock

import pytest
from homeassistant.components.light import LightEntityFeature
from homeassistant.core import CoreState

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.validation import validate_program


@pytest.mark.parametrize("queued", [False, True], ids=["after-close", "waiting-on-lock"])
async def test_reconfiguration_after_close_sends_no_commands_or_extra_writes(
    hass, freezer, monkeypatch, queued
):
    freezer.move_to("2026-10-13T18:03:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    attributes = {
        "brightness": 128,
        "supported_color_modes": ["brightness"],
        "supported_features": LightEntityFeature.TRANSITION,
    }
    hass.states.async_set("light.clock", "on", attributes)
    calls = []

    async def service(call):
        calls.append(call)

    hass.services.async_register("light", "turn_on", service)
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Closed reconfiguration",
            "steps": {
                "clock": {
                    "timing": {"absolute_time": {"start": "18:00"}},
                    "action": "light.turn_on",
                    "entities": ["light.clock"],
                    "data": {"brightness": 128},
                }
            },
        }
    )
    engine = DailyEngine(hass, "closed-reconfigure", program)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        engine._owned["light.clock"] = engine._observe("light.clock")
        engine._native_fades.add("light.clock")
        if queued:
            writes = AsyncMock(wraps=engine._store.async_save)
            monkeypatch.setattr(engine._store, "async_save", writes)
            await engine._lock.acquire()
            reconfigure = asyncio.create_task(engine._async_reconfigure())
            closing = None
            try:
                await asyncio.sleep(0)
                closing = asyncio.create_task(engine.async_close(cleanup=False))
                await asyncio.sleep(0)
                assert engine.closed
            finally:
                engine._lock.release()
                await reconfigure
                if closing:
                    await closing
            writes.assert_awaited_once()  # The close itself persists once.
        else:
            await engine.async_close(cleanup=False)
            writes = AsyncMock(wraps=engine._store.async_save)
            monkeypatch.setattr(engine._store, "async_save", writes)
            await engine._async_reconfigure()
            writes.assert_not_awaited()
        assert not calls
        assert engine.closed and not engine.active
    finally:
        await engine.async_close(cleanup=False)
