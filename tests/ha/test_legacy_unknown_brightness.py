"""An on light can legitimately report an unknown brightness."""

from datetime import timedelta

import pytest
from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.occupied.engine import OccupiedEngine


@pytest.mark.parametrize("brightness", [{"brightness": None}, {}], ids=["null", "missing"])
async def test_unknown_brightness_keeps_legacy_schedule_running(
    hass, config, devices, freezer, brightness
):
    hass.set_state(CoreState.running)
    hass.states.async_set(
        "light.proof", "on", {"supported_color_modes": ["brightness"]} | brightness
    )
    engine = OccupiedEngine(hass, "legacy-null-brightness", config)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        assert engine.active
        assert engine.handover_start_brightness is None
        assert not any(event.kind == "handover" for event in engine._queue)
        at = dt_util.utcnow() + timedelta(
            seconds=config["handover_seconds"]
            + max(config["light_delay_seconds"], config["remote_delay_seconds"]),
            milliseconds=1,
        )
        freezer.move_to(at)
        async_fire_time_changed(hass, at)
        await hass.async_block_till_done()
        assert any(call.domain == "light" and call.service == "turn_on" for call in devices)
        assert any(call.domain == "remote" for call in devices)
    finally:
        await engine.async_close(cleanup=False)
