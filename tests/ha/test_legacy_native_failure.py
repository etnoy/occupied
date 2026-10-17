"""Unexpected native failures must not strand the caller-proof queue."""

from datetime import timedelta

from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.occupied.engine import OccupiedEngine


async def test_unexpected_legacy_service_failure_preserves_later_work(
    hass, config, devices, freezer
):
    hass.set_state(CoreState.running)
    engine = OccupiedEngine(hass, "legacy-native-failure", config)

    async def broken(call):
        raise ValueError("Virtual device rejected command")

    hass.services.async_register("light", "turn_on", broken)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        start = dt_util.utcnow()
        first = engine.next_event + timedelta(milliseconds=1)
        freezer.move_to(first)
        async_fire_time_changed(hass, first)
        await hass.async_block_till_done()
        assert "Virtual device rejected command" in engine.last_error
        assert engine.next_event is not None
        later = start + timedelta(
            seconds=config["handover_seconds"] + config["remote_delay_seconds"], milliseconds=1
        )
        freezer.move_to(later)
        async_fire_time_changed(hass, later)
        await hass.async_block_till_done()
        assert engine.remote_owned
        assert any(call.domain == "remote" for call in devices)
    finally:
        await engine.async_close(cleanup=False)
