"""Restored native handovers keep future deadlines and respect current policy."""

from datetime import timedelta

import pytest
from homeassistant.components.light import LightEntityFeature
from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.validation import program_data, validate_program


@pytest.fixture
async def saved_handover(hass, freezer):
    freezer.move_to("2026-10-13T18:10:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    attributes = {
        "brightness": 128,
        "supported_color_modes": ["brightness"],
        "supported_features": LightEntityFeature.TRANSITION,
    }
    hass.states.async_set("light.clock", "on", attributes)
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Handover",
            "steps": {
                "base": {
                    "timing": {"absolute_time": {"start": "18:00"}},
                    "action": "light.turn_on",
                    "entities": ["light.clock"],
                    "data": {"brightness": 128},
                },
                "opaque": {
                    "timing": {"absolute_time": {"start": "18:22"}},
                    "action": "script.turn_on",
                    "entities": ["light.clock"],
                },
                "endpoint": {
                    "timing": {"absolute_time": {"start": "18:23"}},
                    "action": "light.turn_on",
                    "entities": ["light.clock"],
                    "data": {"brightness": 128},
                },
            },
        }
    )
    calls, engines = [], []

    async def service(call):
        calls.append(call)
        hass.states.async_set("light.clock", "on", attributes, context=call.context)

    hass.services.async_register("light", "turn_on", service)
    hass.services.async_register("script", "turn_on", service)
    engine = DailyEngine(hass, "saved-handover", program)
    engines.append(engine)
    await engine.async_prepare()
    await engine.async_start()
    await engine.async_set_enabled(True)
    # A native transition's in-flight observation can already match its target.
    # Persist that real runtime shape, with a deadline crossed during downtime.
    engine._owned["light.clock"] = engine._observe("light.clock")
    engine._native_fades.add("light.clock")
    engine._handover["light.clock"] = {
        "start": dt_util.utcnow().isoformat(),
        "deadline": (dt_util.utcnow() + timedelta(minutes=10)).isoformat(),
        "observed": {"state": "on", "brightness_pct": 128 * 100 / 255},
        "target": {"state": "on", "brightness_pct": 128 * 100 / 255},
    }
    await engine.async_close(cleanup=False)

    async def restore(current_program=program, at="2026-10-13T18:21:00+00:00"):
        freezer.move_to(at)
        restored = DailyEngine(hass, "saved-handover", current_program)
        engines.append(restored)
        await restored.async_prepare()
        await restored.async_start()
        return restored

    yield program, restore, calls
    for instance in engines:
        await instance.async_close()


@pytest.mark.parametrize("stale_target", [False, True])
async def test_expired_native_handover_does_not_requeue_calls_in_the_past(
    hass, freezer, saved_handover, hass_storage, stale_target
):
    _, restore, calls = saved_handover
    if stale_target:
        saved = hass_storage["occupied.saved-handover.runtime"]["data"]
        saved["handover"]["light.clock"]["target"]["brightness_pct"] = 25
    engine = await restore()
    assert engine.handover_deadline > dt_util.utcnow()
    deadline = engine.handover_deadline
    freezer.move_to("2026-10-13T18:22:00.001+00:00")
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    deferred = [
        event
        for event in engine._queue
        if event.kind == "plan" and event.payload[1].source_id == "opaque"
    ]
    assert len(deferred) == 1 and deferred[0].at == deadline
    assert all(event.at > dt_util.utcnow() for event in engine._queue)
    freezer.move_to(deadline + timedelta(milliseconds=1))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    assert len([call for call in calls if call.domain == "script"]) == 1
    assert not [call for call in calls if call.domain == "light"]
    assert not engine._handover


async def test_run_condition_added_offline_drops_previous_handover(hass, saved_handover):
    program, restore, _ = saved_handover
    data = program_data(program)
    data["run_condition"] = {
        "entity_id": "alarm_control_panel.clock",
        "state": ["armed_away"],
        "enforce_state_on_start": False,
    }
    hass.states.async_set("alarm_control_panel.clock", "armed_away")
    engine = await restore(validate_program(data), at="2026-10-13T18:11:00+00:00")
    assert engine.active
    assert not engine._handover and not engine._native_fades
    assert engine.status == "active"
