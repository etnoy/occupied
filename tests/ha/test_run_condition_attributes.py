"""GPS updates do not save runtime state; actual run-condition changes still do."""

from unittest.mock import AsyncMock

import pytest
from homeassistant.core import CoreState

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.validation import validate_program


@pytest.mark.parametrize("domain", ["person", "device_tracker"])
async def test_attribute_updates_do_not_persist_or_interrupt_the_controller(
    hass, freezer, monkeypatch, domain
):
    freezer.move_to("2026-10-13T18:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    entity = domain + ".resident"
    hass.states.async_set(entity, "not_home", {"latitude": 59.3, "longitude": 18.1})
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Away",
            "run_condition": {"entity_id": entity, "state": ["not_home"]},
        }
    )
    engine = DailyEngine(hass, "gps-" + domain, program)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        assert engine.active
        persist = AsyncMock(wraps=engine._persist)
        permission = AsyncMock(wraps=engine._save_permission)
        monkeypatch.setattr(engine, "_persist", persist)
        monkeypatch.setattr(engine, "_save_permission", permission)
        generation, session = engine.generation, engine.session
        for index in range(20):
            hass.states.async_set(
                entity, "not_home", {"latitude": 59.3 + index / 1000, "longitude": 18.1}
            )
            await hass.async_block_till_done()
        assert persist.await_count == permission.await_count == 0
        assert engine.active and engine.generation == generation and engine.session == session
        hass.states.async_set(entity, "home", {"latitude": 59.4})
        await hass.async_block_till_done()
        assert not engine.active and persist.await_count > 0
        hass.states.async_set(entity, "not_home", {"latitude": 59.4})
        await hass.async_block_till_done()
        assert engine.active and engine.session > session
    finally:
        await engine.async_close()
