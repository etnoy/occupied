"""Time-source changes recover enabled controllers and respect inactive gates."""

from unittest.mock import AsyncMock

import pytest
from homeassistant.core import CoreState

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.validation import validate_program


@pytest.fixture
async def recovery_engine(hass, freezer):
    freezer.move_to("2026-10-13T06:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    hass.states.async_set("input_datetime.clock", "06:10:00", {"has_time": True, "has_date": False})
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Recovery",
            "steps": {
                "clock": {
                    "timing": {"relative_to": {"entity": "input_datetime.clock"}},
                    "action": "script.turn_on",
                    "entities": ["script.clock"],
                }
            },
        }
    )
    engine = DailyEngine(hass, "source-recovery", program)
    await engine.async_prepare()
    await engine.async_start()
    yield engine
    await engine.async_close()


@pytest.mark.parametrize("repaired", ["06:10:00", "06:20:00"])
async def test_fixed_source_recovers_an_enabled_controller(
    hass, recovery_engine, monkeypatch, repaired
):
    engine = recovery_engine
    ensure = engine._ensure_plans

    async def compile_source():
        # Isolate the recovery path from the particular planner error. Invalid
        # sampled windows and executor failures use this same exception path.
        if hass.states.get("input_datetime.clock").state == "broken":
            raise ValueError("Time source cannot currently be compiled")
        await ensure()

    monkeypatch.setattr(engine, "_ensure_plans", compile_source)
    await engine.async_set_enabled(True)
    assert engine.active
    hass.states.async_set("input_datetime.clock", "broken", {"has_time": True, "has_date": False})
    await hass.async_block_till_done()
    assert engine.status == "error" and not engine.active and engine.next_event is None
    hass.states.async_set("input_datetime.clock", repaired, {"has_time": True, "has_date": False})
    await hass.async_block_till_done()
    assert engine.active and engine.status == "active"
    assert engine.next_event is not None and engine._cancel_timer is not None


async def test_actual_timestamp_window_recovers_when_original_source_is_restored(hass, freezer):
    freezer.move_to("2026-10-13T06:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    attributes = {"device_class": "timestamp"}
    hass.states.async_set("sensor.window_end", "2026-10-13T21:00:00+00:00", attributes)
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Timestamp window",
            "random": {
                "evening": {
                    "start": {"absolute_time": {"start": "18:00"}},
                    "end": {"relative_to": {"entity": "sensor.window_end"}},
                    "min_duration": "30m",
                    "max_duration": "1h",
                    "count": 1,
                    "on": {"action": "turn_on", "entities": ["switch.clock"]},
                    "off": {"action": "turn_off", "entities": ["switch.clock"]},
                }
            },
        }
    )
    engine = DailyEngine(hass, "timestamp-recovery", program)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        assert engine.active
        hass.states.async_set("sensor.window_end", "2026-10-13T17:00:00+00:00", attributes)
        await hass.async_block_till_done()
        # Random-sample feasibility is a separate fix. Recovery must work with
        # both the current error policy and its independently proposed warning policy.
        if engine.active:
            assert any(
                issue.code == "random_window" and issue.severity == "warning"
                for plan in engine._plans.values()
                for issue in plan.issues
            )
        else:
            assert engine.status == "error"
        hass.states.async_set("sensor.window_end", "2026-10-13T21:00:00+00:00", attributes)
        await hass.async_block_till_done()
        assert engine.active and engine.status == "active" and engine._cancel_timer is not None
    finally:
        await engine.async_close()


@pytest.mark.parametrize(
    "blocked,status", [("disabled", "disabled"), ("paused", "paused"), ("startup", "waiting")]
)
async def test_source_changes_do_not_compile_while_gated(
    hass, recovery_engine, monkeypatch, blocked, status
):
    engine = recovery_engine
    engine.enabled = blocked != "disabled"
    engine.paused = blocked == "paused"
    engine.started = blocked != "startup"
    await engine.async_reevaluate()
    assert engine.status == status
    ensure = AsyncMock(side_effect=ValueError("Must not plan while gated"))
    monkeypatch.setattr(engine, "_ensure_plans", ensure)
    hass.states.async_set("input_datetime.clock", "06:20:00", {"has_time": True, "has_date": False})
    await hass.async_block_till_done()
    ensure.assert_not_awaited()
    assert engine.status == status and not engine.active and engine.next_event is None
