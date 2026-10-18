"""Device progress remains owned after HA drops a service context."""

from datetime import timedelta
from unittest.mock import AsyncMock

import pytest
from homeassistant.components.light import LightEntityFeature
from homeassistant.core import Context, CoreState
from homeassistant.util import dt as dt_util

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.planner import ResolvedAction
from custom_components.occupied.validation import validate_program


@pytest.mark.parametrize("domain", ["cover", "light"])
@pytest.mark.parametrize("ending", ["complete", "restart", "reverse", "user", "expired"])
async def test_contextless_motion_reports(hass, freezer, monkeypatch, domain, ending):
    freezer.move_to("2026-10-13T18:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    entity = f"{domain}.proof"
    attribute = "brightness" if domain == "light" else "current_position"
    attrs = {attribute: 10}
    if domain == "light":
        attrs |= {
            "supported_color_modes": ["brightness"],
            "supported_features": LightEntityFeature.TRANSITION,
        }
    hass.states.async_set(entity, "on" if domain == "light" else "open", attrs)
    service = "turn_on" if domain == "light" else "set_cover_position"
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Progress",
            "steps": {
                "later": {
                    "timing": {"absolute_time": {"start": "23:00"}},
                    "action": f"{domain}.{service}",
                    "entities": [entity],
                    "data": {"brightness": 100} if domain == "light" else {"position": 100},
                }
            },
        }
    )
    engine = DailyEngine(hass, "motion", program)

    async def handler(call):
        pass

    hass.services.async_register(domain, service, handler)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        action = ResolvedAction(
            f"{domain}.{service}",
            (entity,),
            {"brightness": 100, "transition": 30} if domain == "light" else {"position": 100},
            (entity,),
            True,
        )
        assert await engine._call(action, "motion-test", engine.generation)
        persist = AsyncMock(return_value=True)
        monkeypatch.setattr(engine, "_persist", persist)
        for second in range(2, 22, 2):
            freezer.move_to(dt_util.utcnow() + timedelta(seconds=2))
            hass.states.async_set(
                entity,
                "on" if domain == "light" else "opening",
                attrs | {attribute: 10 + second * 3},
            )
            await hass.async_block_till_done()
            assert entity not in engine._yielded
        assert persist.await_count == 0
        if ending == "restart":
            await engine.async_close(cleanup=False)
            engine = DailyEngine(hass, "motion", program)
            await engine.async_prepare()
            await engine.async_start()
            persist = AsyncMock(return_value=True)
            monkeypatch.setattr(engine, "_persist", persist)
        if ending in {"complete", "restart"}:
            value = 100
        elif ending == "reverse":
            value = 60
        else:
            value = 80
        if ending == "expired":
            freezer.move_to(dt_util.utcnow() + timedelta(minutes=6))
        hass.states.async_set(
            entity,
            "on" if domain == "light" else "open",
            attrs | {attribute: value},
            context=Context(user_id="outside-user") if ending == "user" else None,
        )
        await hass.async_block_till_done()
        assert (entity in engine._yielded) == (ending not in {"complete", "restart"})
        assert persist.await_count == (0 if ending in {"complete", "restart"} else 1)
    finally:
        await engine.async_close(cleanup=False)
