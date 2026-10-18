"""Continuous scheduling keeps due work when timers or planning run late."""

from datetime import timedelta

import pytest
from homeassistant.core import CoreState
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.sensor import OccupiedNextEventSensor
from custom_components.occupied.validation import validate_program


@pytest.fixture
async def queue_runtime(hass, freezer):
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    engines, calls = [], []
    hass.states.async_set("script.clock", "off")

    async def service(call):
        calls.append(call)

    hass.services.async_register("script", "turn_on", service)

    async def start(steps, at="2026-10-13T23:59:00+00:00"):
        freezer.move_to(at)
        program = validate_program({"schema_version": 1, "name": "Queue", "steps": steps})
        engine = DailyEngine(hass, f"queue-{len(engines)}", program)
        engines.append(engine)
        await engine.async_prepare()
        engine._seed = "requeue-regression"
        await engine.async_start()
        await engine.async_set_enabled(True)
        return engine

    yield start, calls
    for engine in engines:
        await engine.async_close()


def clock_step(start, end=None):
    timing = {"start": start}
    if end:
        timing["end"] = end
    return {
        "timing": {"absolute_time": timing},
        "action": "script.turn_on",
        "entities": ["script.clock"],
    }


async def fire(hass, freezer, at):
    freezer.move_to(at)
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


@pytest.mark.parametrize(
    "timezone,at,expected",
    [
        ("UTC", "2026-10-13T23:59:00+00:00", "2026-10-14T06:00:00+00:00"),
        ("Europe/Stockholm", "2026-10-13T23:59:00+02:00", "2026-10-14T06:00:00+02:00"),
        ("Europe/Stockholm", "2026-03-28T23:59:00+01:00", "2026-03-29T06:00:00+02:00"),
        ("Europe/Stockholm", "2026-10-24T23:59:00+02:00", "2026-10-25T06:00:00+01:00"),
    ],
)
async def test_next_event_skips_daily_refresh(hass, freezer, queue_runtime, timezone, at, expected):
    start, calls = queue_runtime
    await hass.config.async_set_time_zone(timezone)
    engine = await start({"morning": clock_step("06:00")}, at)
    expected = dt_util.as_utc(dt_util.parse_datetime(expected))
    sensor = OccupiedNextEventSensor(engine)
    assert engine._queue[0].kind == "boundary"
    assert engine._cancel_timer is not None
    assert sensor.native_value == expected
    assert engine.snapshot()["next_event"] == expected.isoformat()

    await fire(hass, freezer, engine._queue[0].at + timedelta(milliseconds=1))
    assert not calls
    assert engine._queue[0].kind == "plan"
    assert sensor.native_value == expected
    await fire(hass, freezer, expected + timedelta(milliseconds=1))
    assert len(calls) == 1
    assert sensor.native_value > expected
    await engine.async_set_enabled(False)
    assert sensor.native_value is None


async def test_next_event_is_empty_when_only_daily_refresh_is_scheduled(
    hass, freezer, queue_runtime
):
    start, calls = queue_runtime
    engine = await start({"disabled": clock_step("06:00") | {"enabled": False}})
    assert engine._queue[0].kind == "boundary"
    assert engine.next_event is None
    await fire(hass, freezer, engine._queue[0].at + timedelta(milliseconds=1))
    assert engine.active and not calls
    assert engine._cancel_timer is not None
    assert engine.next_event is None


async def test_next_event_keeps_actions_before_daily_refresh(queue_runtime):
    start, _ = queue_runtime
    engine = await start({"evening": clock_step("23:59:30"), "morning": clock_step("06:00")})
    assert engine.next_event == dt_util.parse_datetime("2026-10-13T23:59:30+00:00")


async def test_midnight_step_runs_when_boundary_timer_is_late(hass, freezer, queue_runtime):
    start, calls = queue_runtime
    engine = await start({"midnight": clock_step("00:00")})
    assert engine.next_event == dt_util.parse_datetime("2026-10-14T00:00:00+00:00")
    await fire(hass, freezer, "2026-10-14T00:00:00.001+00:00")
    assert len(calls) == 1
    assert engine._journal["live:step:2026-10-14:step:midnight:0"]["status"] == "dispatched"


async def test_sampled_event_survives_planning_across_its_instant(
    hass, freezer, queue_runtime, monkeypatch
):
    start, calls = queue_runtime
    engine = await start({"sample": clock_step("00:00:20", "00:00:40")})
    ensure = engine._ensure_plans

    async def slow_planning():
        await ensure()
        freezer.move_to("2026-10-14T00:01:00.001+00:00")

    monkeypatch.setattr(engine, "_ensure_plans", slow_planning)
    await fire(hass, freezer, "2026-10-14T00:00:01.001+00:00")
    assert len(calls) == 1
    assert engine._journal["live:step:2026-10-14:step:sample:0"]["status"] == "dispatched"


async def test_source_requeue_keeps_an_undispatched_due_event(hass, freezer, queue_runtime):
    start, calls = queue_runtime
    attributes = {"start_time": "2026-10-13T18:01:00+00:00"}
    hass.states.async_set("calendar.work", "off", attributes)
    step = clock_step("18:01")
    step["timing"] = {"relative_to": {"entity": "calendar.work", "attribute": "start_time"}}
    engine = await start({"calendar": step}, "2026-10-13T18:00:00+00:00")
    # The source callback owns the engine lock before the delayed timer dispatch.
    engine._cancel_timer()
    engine._cancel_timer = None
    freezer.move_to("2026-10-13T18:01:00.001+00:00")
    # Advance the used timestamp to the next occurrence. Calendar on/off alone
    # no longer changes planning identity; the reached anchor remains latched.
    hass.states.async_set("calendar.work", "on", {"start_time": "2026-10-14T18:01:00+00:00"})
    await engine._async_time_sources_changed()
    await fire(hass, freezer, dt_util.utcnow() + timedelta(milliseconds=1))
    assert len(calls) == 1
    assert engine._journal["live:step:2026-10-13:step:calendar:0"]["status"] == "dispatched"


async def test_source_change_does_not_backfill_before_activation(hass, freezer, queue_runtime):
    start, calls = queue_runtime
    attributes = {"has_time": True, "has_date": False}
    hass.states.async_set("input_datetime.clock", "18:05:00", attributes)
    step = clock_step("18:05")
    step["timing"] = {"relative_to": {"entity": "input_datetime.clock"}}
    engine = await start({"source": step}, "2026-10-13T18:02:00+00:00")
    freezer.move_to("2026-10-13T18:03:00.001+00:00")
    hass.states.async_set("input_datetime.clock", "18:01:00", attributes)
    await hass.async_block_till_done()
    assert not calls
    assert engine._journal["live:step:2026-10-13:step:source:0"]["status"] == "historical_skipped"


async def test_retry_survives_a_midnight_boundary(hass, freezer, queue_runtime):
    start, _ = queue_runtime
    attempts = []
    hass.states.async_set("switch.clock", "off")

    async def service(call):
        attempts.append(call)
        if len(attempts) == 1:
            raise HomeAssistantError("Temporary failure")

    hass.services.async_register("switch", "turn_on", service)
    step = clock_step("23:59:59")
    step.update(action="switch.turn_on", entities=["switch.clock"])
    engine = await start({"retry": step})
    await fire(hass, freezer, "2026-10-13T23:59:59.001+00:00")
    assert any(event.kind == "retry" for event in engine._queue)
    assert engine.next_event == next(event.at for event in engine._queue if event.kind == "retry")
    await fire(hass, freezer, "2026-10-14T00:00:00.002+00:00")
    assert len(attempts) == 2
    assert engine._journal["live:step:2026-10-13:step:retry:0"]["status"] == "dispatched"


async def test_source_requeue_keeps_a_handover_deferred_plan(hass, freezer, queue_runtime):
    start, calls = queue_runtime
    hass.states.async_set("light.clock", "off", {"supported_color_modes": ["onoff"]})
    hass.states.async_set("input_datetime.clock", "23:00:00", {"has_time": True, "has_date": False})
    base = clock_step("18:01")
    base.update(action="light.turn_on", entities=["light.clock"])
    endpoint = clock_step("18:12")
    endpoint.update(action="light.turn_on", entities=["light.clock"])

    async def turn_on(call):
        hass.states.async_set(
            "light.clock", "on", {"supported_color_modes": ["onoff"]}, context=call.context
        )

    hass.services.async_register("light", "turn_on", turn_on)
    deferred = clock_step("18:04")
    deferred["entities"] = ["light.clock"]
    source = clock_step("23:00")
    source["timing"] = {"relative_to": {"entity": "input_datetime.clock"}}
    engine = await start(
        {"base": base, "deferred": deferred, "source": source, "endpoint": endpoint},
        "2026-10-13T18:03:00+00:00",
    )
    assert "light.clock" in engine._handover
    await fire(hass, freezer, "2026-10-13T18:04:00.001+00:00")
    key = "live:step:2026-10-13:step:deferred:0"
    pending = next(event for event in engine._queue if event.key == key)
    assert pending.at > dt_util.utcnow()
    hass.states.async_set("input_datetime.clock", "23:10:00", {"has_time": True, "has_date": False})
    await hass.async_block_till_done()
    assert any(event.key == key and event.at == pending.at for event in engine._queue)
    await fire(hass, freezer, pending.at + timedelta(milliseconds=1))
    assert len(calls) == 1
    assert engine._journal[key]["status"] == "dispatched"
