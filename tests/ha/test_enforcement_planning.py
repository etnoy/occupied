"""One enforcement pass shares projections without hiding newer or manual intent."""

from unittest.mock import Mock

import pytest
from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util

import custom_components.occupied.engine_daily as daily
from custom_components.occupied.validation import validate_program


@pytest.mark.parametrize("advance", [False, True])
async def test_enforcement_reuses_projection_until_intent_changes(
    hass, freezer, monkeypatch, advance
):
    freezer.move_to("2026-10-13T18:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    hass.states.async_set("sensor.gate", "on")
    entities = [f"light.proof_{index}" for index in range(8)]
    for entity in entities:
        hass.states.async_set(entity, "off", {"supported_color_modes": ["brightness"]})
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Projection",
            "run_condition": {
                "entity_id": "sensor.gate",
                "state": ["on"],
                "enforce_state_on_start": False,
            },
            "steps": {
                "before": {
                    "timing": {"absolute_time": {"start": "17:00"}},
                    "action": "light.turn_on",
                    "entities": entities,
                    "data": {"brightness": 100},
                },
                "after": {
                    "timing": {"absolute_time": {"start": "18:00:05"}},
                    "action": "light.turn_on",
                    "entities": entities,
                    "data": {"brightness": 200},
                },
            },
        }
    )
    calls = []

    async def service(call):
        brightness = call.data.get("brightness")
        if brightness is None:
            brightness = round(call.data["brightness_pct"] * 255 / 100)
        calls.append(brightness)
        if advance and len(calls) == 1:
            freezer.move_to("2026-10-13T18:00:06+00:00")
        hass.states.async_set(
            call.data["entity_id"],
            "on",
            {"brightness": brightness, "supported_color_modes": ["brightness"]},
            context=call.context,
        )

    hass.services.async_register("light", "turn_on", service)
    engine = daily.DailyEngine(hass, "projection-cache", program)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        if engine._cancel_timer:
            engine._cancel_timer()
            engine._cancel_timer = None
        monkeypatch.setattr(daily, "ENFORCEMENT_CONCURRENCY", 1)
        project = Mock(wraps=engine._expected_actions)
        context = Mock(wraps=daily.planning_context)
        monkeypatch.setattr(engine, "_expected_actions", project)
        monkeypatch.setattr(daily, "planning_context", context)
        await engine._enforce_expected_state(dt_util.utcnow(), engine.generation, immediate=True)
        assert len(calls) == len(entities)
        assert calls == [100] + [200 if advance else 100] * 7
        assert project.call_count == (2 if advance else 1)
        assert context.call_count == 0
    finally:
        await engine.async_close(cleanup=False)
