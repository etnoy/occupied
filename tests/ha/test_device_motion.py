"""Device progress remains owned after HA drops a service context."""

from datetime import timedelta
from unittest.mock import AsyncMock

import pytest
from homeassistant.components.light import LightEntityFeature
from homeassistant.core import Context, CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.planner import ResolvedAction
from custom_components.occupied.validation import validate_program


@pytest.mark.parametrize("acknowledgement", ["occupied", "contextless"])
@pytest.mark.parametrize("ending", ["off", "reverse", "off_during_downtime"])
async def test_manual_control_during_fade_on_is_yielded(hass, freezer, acknowledgement, ending):
    freezer.move_to("2026-10-13T18:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    attrs = {
        "brightness": 0,
        "supported_color_modes": ["brightness"],
        "supported_features": LightEntityFeature.TRANSITION,
    }
    hass.states.async_set("light.proof", "off", attrs)
    calls = []

    async def service(call):
        calls.append(call)
        hass.states.async_set(
            "light.proof",
            "on",
            attrs | {"brightness": 60},
            context=call.context if acknowledgement == "occupied" else None,
        )

    hass.services.async_register("light", "turn_on", service)
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Manual fade control",
            "steps": {
                "base": {
                    "timing": {"absolute_time": {"start": "17:00"}},
                    "action": "light.turn_on",
                    "entities": ["light.proof"],
                    "data": {"brightness": 100},
                }
            },
        }
    )
    engine = DailyEngine(hass, "fade-manual-control", program)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        freezer.move_to("2026-10-13T18:00:00.001+00:00")
        async_fire_time_changed(hass, dt_util.utcnow())
        await hass.async_block_till_done()
        assert len(calls) == 1 and "light.proof" in engine._handover
        if ending == "off_during_downtime":
            await engine.async_close(cleanup=False)
        freezer.move_to("2026-10-13T18:01:00.001+00:00")
        hass.states.async_set(
            "light.proof",
            "on" if ending == "reverse" else "off",
            attrs | {"brightness": 30 if ending == "reverse" else 0},
        )
        await hass.async_block_till_done()
        if ending == "off_during_downtime":
            engine = DailyEngine(hass, "fade-manual-control", program)
            await engine.async_prepare()
            await engine.async_start()
            await hass.async_block_till_done()
        assert "light.proof" in engine._yielded
        freezer.move_to("2026-10-13T18:11:00.001+00:00")
        async_fire_time_changed(hass, dt_util.utcnow())
        await hass.async_block_till_done()
        assert len(calls) == 1
        assert hass.states.get("light.proof").state == ("on" if ending == "reverse" else "off")
    finally:
        await engine.async_close(cleanup=False)


@pytest.mark.parametrize("domain", ["cover", "cover_axes", "light"])
@pytest.mark.parametrize(
    "ending", ["complete", "restart", "reverse", "user", "automation", "expired"]
)
async def test_contextless_motion_reports(hass, freezer, monkeypatch, domain, ending):
    freezer.move_to("2026-10-13T18:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    multi_axis = domain == "cover_axes"
    domain = "cover" if multi_axis else domain
    entity = f"{domain}.proof"
    attribute = "brightness" if domain == "light" else "current_position"
    attrs = {attribute: 10}
    if multi_axis:
        attrs["current_tilt_position"] = 10
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
    if multi_axis:
        hass.services.async_register("cover", "set_cover_tilt_position", handler)
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
        if multi_axis:
            tilt = ResolvedAction(
                "cover.set_cover_tilt_position", (entity,), {"tilt_position": 70}, (entity,), True
            )
            assert await engine._call(tilt, "tilt-test", engine.generation)
        persist = AsyncMock(return_value=True)
        monkeypatch.setattr(engine, "_persist", persist)
        for second in range(2, 22, 2):
            freezer.move_to(dt_util.utcnow() + timedelta(seconds=2))
            hass.states.async_set(
                entity,
                "on" if domain == "light" else "opening",
                attrs
                | {attribute: 10 + second * 3}
                | ({"current_tilt_position": 10 + second * 2} if multi_axis else {}),
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
            attrs | {attribute: value} | ({"current_tilt_position": 70} if multi_axis else {}),
            context=Context(user_id="outside-user")
            if ending == "user"
            else Context(parent_id="outside-automation")
            if ending == "automation"
            else None,
        )
        await hass.async_block_till_done()
        assert (entity in engine._yielded) == (ending not in {"complete", "restart"})
        assert persist.await_count == (0 if ending in {"complete", "restart"} else 1)
    finally:
        await engine.async_close(cleanup=False)


@pytest.mark.parametrize(
    "key,target,reported,mode",
    [
        ("brightness_pct", 33, 85, "brightness"),
        ("rgb_color", [30, 40, 50], [31, 39, 51], "rgb"),
        ("hs_color", [0, 60], [359.5, 60.5], "hs"),
        ("color_temp_kelvin", 4000, 4035, "color_temp"),
    ],
)
async def test_rounded_light_endpoint_completes_owned_motion(
    hass, freezer, key, target, reported, mode
):
    freezer.move_to("2026-10-13T18:00:00+00:00")
    hass.set_state(CoreState.running)
    await hass.config.async_set_time_zone("UTC")
    attribute = "brightness" if key == "brightness_pct" else key
    initial = 20 if isinstance(reported, (int, float)) else [10] * len(reported)
    attrs = {
        attribute: initial,
        "supported_color_modes": [mode],
        "supported_features": LightEntityFeature.TRANSITION,
    }
    hass.states.async_set("light.proof", "on", attrs)
    hass.services.async_register("light", "turn_on", AsyncMock())
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Rounded endpoint",
            "steps": {
                "later": {
                    "timing": {"absolute_time": {"start": "23:00"}},
                    "action": "light.turn_on",
                    "entities": ["light.proof"],
                    "data": {key: target},
                }
            },
        }
    )
    engine = DailyEngine(hass, "rounded-motion", program)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        action = ResolvedAction(
            "light.turn_on",
            ("light.proof",),
            {key: target, "transition": 30},
            ("light.proof",),
            True,
        )
        assert await engine._call(action, "rounded-endpoint", engine.generation)
        assert "light.proof" in engine._motions
        freezer.move_to("2026-10-13T18:00:10.001+00:00")
        hass.states.async_set("light.proof", "on", attrs | {attribute: reported})
        await hass.async_block_till_done()
        assert "light.proof" not in engine._yielded
        assert "light.proof" not in engine._motions
    finally:
        await engine.async_close(cleanup=False)
