"""Replanning must retain startup qualification under an unchanged run policy."""

from datetime import timedelta

import pytest
from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.validation import program_data, validate_program


@pytest.fixture
async def qualifying_engine(hass, freezer):
    freezer.move_to("2026-10-13T18:03:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    hass.states.async_set("sensor.alarm", "armed")
    hass.states.async_set("light.clock", "off", {"supported_color_modes": ["onoff"]})
    calls = []

    async def service(call):
        calls.append(call)
        hass.states.async_set(
            "light.clock", "on", {"supported_color_modes": ["onoff"]}, context=call.context
        )

    hass.services.async_register("light", "turn_on", service)
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Startup qualification",
            "run_condition": {
                "entity_id": "sensor.alarm",
                "state": ["armed"],
                "enforce_state_on_start": True,
                "start_delay": "30s",
            },
            "steps": {
                "clock": {
                    "timing": {"absolute_time": {"start": "18:00"}},
                    "action": "light.turn_on",
                    "entities": ["light.clock"],
                }
            },
        }
    )
    engine = DailyEngine(hass, "qualifying-reconfigure", program)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        assert engine.activation_deadline == dt_util.utcnow() + timedelta(seconds=30)
        yield engine, calls
    finally:
        await engine.async_close(cleanup=False)


async def move(hass, freezer, at):
    freezer.move_to(at)
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


@pytest.mark.parametrize("change", ["schedule", "core"])
@pytest.mark.parametrize("cancel", [False, True], ids=["enforce", "condition-lost"])
async def test_replanning_keeps_qualification_deadline(
    hass, freezer, qualifying_engine, change, cancel
):
    engine, calls = qualifying_engine
    deadline = engine.activation_deadline
    await move(hass, freezer, deadline - timedelta(seconds=20))
    if change == "schedule":
        source = program_data(engine.program)
        source["steps"]["clock"]["timing"] = {"absolute_time": {"start": "17:00"}}
        await engine.async_replace_program(validate_program(source))
    else:
        await hass.config.async_update(latitude=hass.config.latitude + 1)
        await hass.async_block_till_done()
    assert not calls
    if cancel:
        hass.states.async_set("sensor.alarm", "disarmed")
        await hass.async_block_till_done()
        assert engine.activation_deadline is None
        await move(hass, freezer, deadline + timedelta(milliseconds=1))
        assert not calls and not engine.active
    else:
        assert engine.activation_deadline == deadline
        assert engine.status == "waiting"
        await move(hass, freezer, deadline - timedelta(milliseconds=1))
        assert not calls
        await move(hass, freezer, deadline + timedelta(milliseconds=1))
        assert len(calls) == 1
        assert engine.activation_deadline is None
        assert engine.reconciliation["phase"] == "complete"


async def test_changed_policy_starts_its_new_qualification_delay(hass, freezer, qualifying_engine):
    engine, calls = qualifying_engine
    old_deadline = engine.activation_deadline
    await move(hass, freezer, old_deadline - timedelta(seconds=20))
    source = program_data(engine.program)
    source["run_condition"]["start_delay"] = "40s"
    await engine.async_replace_program(validate_program(source))
    new_deadline = dt_util.utcnow() + timedelta(seconds=40)
    assert engine.activation_deadline == new_deadline
    await move(hass, freezer, old_deadline + timedelta(milliseconds=1))
    assert not calls
    await move(hass, freezer, new_deadline + timedelta(milliseconds=1))
    assert len(calls) == 1
