"""Persist the context used to build plans, even when shutdown races source changes."""

from copy import deepcopy

from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.validation import validate_program


async def test_shutdown_does_not_label_old_plans_with_new_source_context(
    hass, hass_storage, freezer
):
    freezer.move_to("2026-10-13T18:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    attributes = {"has_time": True, "has_date": False}
    hass.states.async_set("input_datetime.clock", "18:01:00", attributes)
    calls = []

    async def service(call):
        calls.append(call)

    hass.services.async_register("script", "turn_on", service)
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Saved context",
            "steps": {
                "clock": {
                    "timing": {"relative_to": {"entity": "input_datetime.clock"}},
                    "action": "script.turn_on",
                    "entities": ["script.clock"],
                }
            },
        }
    )
    original = DailyEngine(hass, "context-race", program)
    restored = None
    try:
        await original.async_prepare()
        await original.async_start()
        await original.async_set_enabled(True)
        planned_context = deepcopy(original._saved_context)
        # Stop the listener to reproduce shutdown occurring after HA updated the
        # state but before its queued Occupied replan callback can acquire the lock.
        original._state_unsub()
        original._state_unsub = None
        hass.states.async_set("input_datetime.clock", "18:03:00", attributes)
        await original.async_close(cleanup=False)
        saved = hass_storage["occupied.context-race.runtime"]["data"]
        assert saved["context"] == planned_context
        restored = DailyEngine(hass, "context-race", program)
        await restored.async_prepare()
        await restored.async_start()
        freezer.move_to("2026-10-13T18:01:00.001+00:00")
        async_fire_time_changed(hass, dt_util.utcnow())
        await hass.async_block_till_done()
        assert not calls
        freezer.move_to("2026-10-13T18:03:00.001+00:00")
        async_fire_time_changed(hass, dt_util.utcnow())
        await hass.async_block_till_done()
        assert len(calls) == 1
        assert restored._saved_context == restored._context_identity()
    finally:
        await original.async_close()
        if restored:
            await restored.async_close()
