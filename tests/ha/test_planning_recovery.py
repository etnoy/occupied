"""Sampled skips preserve daily scheduling; genuine planning errors retry later."""

import logging
from datetime import date, timedelta
from pathlib import Path

import pytest
from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.file_config import load_yaml
from custom_components.occupied.validation import program_data, validate_program

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
async def resilient_runtime(hass, freezer):
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    attributes = {"supported_color_modes": ["onoff"]}
    hass.states.async_set("light.clock", "off", attributes)
    hass.states.async_set("script.clock", "off")
    calls, engines = [], []

    async def service(call):
        calls.append(call)
        targets = call.data["entity_id"]
        for entity in [targets] if isinstance(targets, str) else targets:
            hass.states.async_set(
                entity,
                "off" if call.service == "turn_off" else "on",
                attributes,
                context=call.context,
            )

    for domain in ("script", "light"):
        for name in ("turn_on", "turn_off"):
            hass.services.async_register(domain, name, service)

    async def start(at, random=True, condition=False):
        freezer.move_to(at)
        data = program_data(
            load_yaml((ROOT / "tests/fixtures/programs/resilient-samples.yaml").read_text())
        )
        if not random:
            data.pop("random")
        if condition:
            data["run_condition"] = {
                "entity_id": "input_boolean.allow",
                "state": ["on"],
                "enforce_state_on_start": True,
                "start_delay": "10s",
            }
            hass.states.async_set("input_boolean.allow", "on")
        engine = DailyEngine(hass, f"resilience-{len(engines)}", validate_program(data))
        engines.append(engine)
        await engine.async_prepare()
        engine._seed = 0
        await engine.async_start()
        await engine.async_set_enabled(True)
        return engine

    yield start, calls
    for engine in engines:
        await engine.async_close()


async def fire(hass, freezer, at):
    freezer.move_to(at)
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


async def test_random_samples_do_not_stop_a_month_of_daily_steps(
    hass, freezer, resilient_runtime, caplog
):
    caplog.set_level(logging.WARNING)
    start, calls = resilient_runtime
    engine = await start("2026-01-01T00:00:00.001+00:00")
    end = dt_util.parse_datetime("2026-02-01T00:00:00+00:00")
    ticks = 0
    # Drive internal refresh timers as well as the user-visible actions.
    while engine._queue and engine._queue[0].at < end:
        await fire(hass, freezer, engine._queue[0].at + timedelta(milliseconds=1))
        assert engine.active and engine.status != "error", engine.reason
        ticks += 1
        assert ticks < 2000
    assert engine.active and engine.next_event >= end
    assert len([call for call in calls if call.domain == "script"]) == 31
    assert any("random_window_skipped" in record.getMessage() for record in caplog.records)
    assert not any(record.levelno >= logging.ERROR for record in caplog.records)


async def fail_one_boundary(engine, monkeypatch):
    ensure = engine._ensure_plans
    attempts = []
    failed_day = dt_util.utcnow().date() + timedelta(days=1)

    async def compile():
        attempts.append(dt_util.utcnow())
        if dt_util.utcnow().date() == failed_day:
            raise ValueError("Transient planning failure")
        await ensure()

    monkeypatch.setattr(engine, "_ensure_plans", compile)
    return attempts


async def test_planning_error_retries_at_next_midnight(
    hass, freezer, resilient_runtime, monkeypatch
):
    start, _ = resilient_runtime
    engine = await start("2026-01-10T23:59:00+00:00", random=False)
    attempts = await fail_one_boundary(engine, monkeypatch)
    await fire(hass, freezer, "2026-01-11T00:00:00.001+00:00")
    assert engine.status == "error" and not engine.active
    assert len(attempts) == 1
    await fire(hass, freezer, "2026-01-12T00:00:00.001+00:00")
    assert len(attempts) == 2
    assert engine.active and engine.status == "active" and engine.next_event is not None


@pytest.mark.parametrize("action", ["disable", "close"])
async def test_stopping_cancels_a_planning_retry(
    hass, freezer, resilient_runtime, monkeypatch, action
):
    start, _ = resilient_runtime
    engine = await start("2026-01-10T23:59:00+00:00", random=False)
    attempts = await fail_one_boundary(engine, monkeypatch)
    await fire(hass, freezer, "2026-01-11T00:00:00.001+00:00")
    assert engine.status == "error"
    failed_attempts = len(attempts)
    if action == "disable":
        await engine.async_set_enabled(False)
    else:
        await engine.async_close()
    await fire(hass, freezer, "2026-01-12T00:00:00.001+00:00")
    assert len(attempts) == failed_attempts
    assert not engine.active and engine.next_event is None


async def test_initial_planning_error_retries_on_the_next_local_date(
    hass, freezer, resilient_runtime, monkeypatch
):
    start, _ = resilient_runtime
    ensure = DailyEngine._ensure_plans

    async def compile(engine):
        if dt_util.utcnow().day == 10:
            raise ValueError("Initial planning failure")
        await ensure(engine)

    monkeypatch.setattr(DailyEngine, "_ensure_plans", compile)
    engine = await start("2026-01-10T00:00:00+00:00", random=False)
    assert engine.status == "error" and not engine.active
    await fire(hass, freezer, "2026-01-11T00:00:00.001+00:00")
    assert engine.active and engine.status == "active" and engine.next_event is not None


async def test_activation_planning_error_retries_then_enforces_normally(
    hass, freezer, resilient_runtime, monkeypatch
):
    start, _ = resilient_runtime
    ensure = DailyEngine._ensure_plans
    attempts = []

    async def compile(engine):
        attempts.append(dt_util.utcnow())
        if len(attempts) > 1 and dt_util.utcnow().day == 10:
            raise ValueError("Activation planning failure")
        await ensure(engine)

    monkeypatch.setattr(DailyEngine, "_ensure_plans", compile)
    engine = await start("2026-01-10T00:00:00+00:00", random=False, condition=True)
    await fire(hass, freezer, "2026-01-10T00:00:10.001+00:00")
    assert engine.status == "error" and not engine.active
    await fire(hass, freezer, "2026-01-11T00:00:00.001+00:00")
    assert engine.active and engine.activation_deadline is not None
    await fire(hass, freezer, "2026-01-11T00:00:10.002+00:00")
    assert engine.active and engine.status == "active" and engine.next_event is not None


@pytest.mark.parametrize(
    "at,recovered_at",
    [
        ("2026-03-29T00:00:00+01:00", "2026-03-30T00:00:00.001+02:00"),
        ("2026-10-25T00:00:00+02:00", "2026-10-26T00:00:00.001+01:00"),
    ],
)
async def test_planning_retry_uses_local_midnight_across_dst(
    hass, freezer, resilient_runtime, monkeypatch, at, recovered_at
):
    await hass.config.async_set_time_zone("Europe/Stockholm")
    start, _ = resilient_runtime
    ensure = DailyEngine._ensure_plans
    failed_day = date.fromisoformat(at.split("T")[0])

    async def compile(engine):
        if dt_util.now().date() == failed_day:
            raise ValueError("Planning unavailable on the DST transition date")
        await ensure(engine)

    monkeypatch.setattr(DailyEngine, "_ensure_plans", compile)
    engine = await start(at, random=False)
    assert engine.status == "error"
    await fire(hass, freezer, dt_util.parse_datetime(recovered_at) - timedelta(milliseconds=2))
    assert not engine.active
    await fire(hass, freezer, recovered_at)
    assert engine.active and engine.status == "active"
