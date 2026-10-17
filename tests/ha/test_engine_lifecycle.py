"""One-time HA lifecycle listeners can fire before entry unload."""

import logging

import pytest
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, EVENT_HOMEASSISTANT_STOP
from homeassistant.core import CoreState
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.occupied.engine import OccupiedEngine
from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.validation import validate_program


@pytest.fixture(params=["daily", "legacy"])
def engine(hass, request, config, program_dict):
    hass.set_state(CoreState.not_running)
    if request.param == "daily":
        return DailyEngine(hass, "lifecycle", validate_program(program_dict))
    return OccupiedEngine(hass, "lifecycle", config)


def assert_no_errors(caplog):
    assert not [record.getMessage() for record in caplog.records if record.levelno >= logging.ERROR]


async def test_unload_after_startup_does_not_cancel_a_fired_listener(hass, engine, caplog):
    await engine.async_prepare()
    await engine.async_start()
    assert not engine.started
    hass.set_state(CoreState.running)
    hass.bus.async_fire(EVENT_HOMEASSISTANT_STARTED)
    await hass.async_block_till_done()
    assert engine.started
    await engine.async_close()
    await hass.async_block_till_done()
    assert_no_errors(caplog)


async def test_shutdown_does_not_cancel_its_fired_listener(hass, engine, caplog):
    hass.set_state(CoreState.running)
    await engine.async_prepare()
    await engine.async_start()
    hass.bus.async_fire(EVENT_HOMEASSISTANT_STOP)
    await hass.async_block_till_done()
    assert engine.closed
    await engine.async_close()
    assert_no_errors(caplog)


async def test_unload_before_startup_cancels_pending_callbacks(hass, engine, caplog):
    await engine.async_prepare()
    await engine.async_start()
    await engine.async_close()
    hass.set_state(CoreState.running)
    hass.bus.async_fire(EVENT_HOMEASSISTANT_STARTED)
    hass.bus.async_fire(EVENT_HOMEASSISTANT_STOP)
    await hass.async_block_till_done()
    assert engine.closed and not engine.started
    assert_no_errors(caplog)


async def test_entry_reload_after_home_assistant_startup(hass, program_dict, caplog):
    hass.set_state(CoreState.not_running)
    entry = MockConfigEntry(
        domain="occupied", data={"source": "gui", "name": "Lifecycle", "program": program_dict}
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    original = entry.runtime_data
    hass.set_state(CoreState.running)
    hass.bus.async_fire(EVENT_HOMEASSISTANT_STARTED)
    await hass.async_block_till_done()
    assert original.started
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert original.closed and entry.runtime_data is not original
    assert entry.runtime_data.started
    assert_no_errors(caplog)
