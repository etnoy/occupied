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


@pytest.mark.parametrize("startup", [False, True])
@pytest.mark.parametrize("activity", [None, "Listen to Music", "Watch TV"])
async def test_enforcement_restores_harmony_activity_and_device_settings(
    hass, freezer, startup, activity
):
    freezer.move_to("2026-10-13T18:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    hass.states.async_set("sensor.gate", "off")
    hass.states.async_set(
        "remote.harmony", "on" if activity else "off", {"current_activity": activity or "PowerOff"}
    )
    hass.states.async_set("input_number.level", "1")
    hass.states.async_set("media_player.tv", "on", {"volume_level": 0.1, "source": "HDMI 2"})
    hass.states.async_set("script.opaque", "off")
    calls = []

    async def handle(call):
        calls.append((call.domain, call.service, dict(call.data)))
        entity = call.data["entity_id"]
        if call.domain == "remote":
            hass.states.async_set(
                entity, "on", {"current_activity": call.data["activity"]}, context=call.context
            )
        elif call.domain == "input_number":
            hass.states.async_set(entity, str(call.data["value"]), context=call.context)
        else:
            attrs = dict(hass.states.get(entity).attributes)
            attrs.update({k: v for k, v in call.data.items() if k != "entity_id"})
            hass.states.async_set(entity, "on", attrs, context=call.context)

    for domain, service in [
        ("remote", "turn_on"),
        ("input_number", "set_value"),
        ("media_player", "volume_set"),
        ("media_player", "select_source"),
    ]:
        hass.services.async_register(domain, service, handle)
    actions = [
        ("remote.turn_on", "remote.harmony", {"activity": "Watch TV"}),
        ("input_number.set_value", "input_number.level", {"value": 7}),
        ("media_player.volume_set", "media_player.tv", {"volume_level": 0.4}),
        ("media_player.select_source", "media_player.tv", {"source": "HDMI 1"}),
        ("script.turn_on", "script.opaque", {}),
    ]
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Devices",
            "run_condition": {
                "entity_id": "sensor.gate",
                "state": ["on"],
                "enforce_state_on_start": startup,
                "start_delay": "0s",
            },
            "steps": {
                f"step_{i}": {
                    "timing": {"absolute_time": {"start": "17:00"}},
                    "action": service,
                    "entities": [entity],
                    "data": data,
                }
                for i, (service, entity, data) in enumerate(actions)
            },
        }
    )
    engine = daily.DailyEngine(hass, "device-enforcement", program)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        hass.states.async_set("sensor.gate", "on")
        await hass.async_block_till_done()
        await engine.async_reevaluate()
        if startup:
            await engine._async_dispatch(engine.generation)
        else:
            await engine.async_enforce_state_now()
        expected_calls = 3 if activity == "Watch TV" else 4
        assert len(calls) == expected_calls
        assert hass.states.get("remote.harmony").attributes["current_activity"] == "Watch TV"
        assert hass.states.get("input_number.level").state == "7"
        assert hass.states.get("media_player.tv").attributes["source"] == "HDMI 1"
        assert engine.reconciliation["results"]["script.opaque"]["status"] == "skipped"
        await engine.async_enforce_state_now()
        assert len(calls) == expected_calls  # Matching activities and numbers are not resent.
    finally:
        await engine.async_close(cleanup=False)
