"""A bounded service wait must not cancel or replay an in-flight native handler."""

import asyncio
import logging

import pytest
from homeassistant.core import Context, CoreState
from homeassistant.exceptions import HomeAssistantError

from custom_components.occupied import actions
from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.planner import ResolvedAction
from custom_components.occupied.validation import validate_program


@pytest.fixture
async def slow_service(hass, monkeypatch):
    monkeypatch.setattr(actions, "SERVICE_TIMEOUT", 0.02)
    entered, release, finished = asyncio.Event(), asyncio.Event(), asyncio.Event()
    state = {"cancelled": False, "fail": False, "calls": 0}

    async def handler(call):
        state["calls"] += 1
        entered.set()
        try:
            await release.wait()
        except asyncio.CancelledError:
            state["cancelled"] = True
            raise
        finished.set()
        if state["fail"]:
            raise HomeAssistantError("Late native failure")

    hass.services.async_register("script", "turn_on", handler)
    hass.services.async_register("switch", "turn_on", handler)
    yield entered, release, finished, state
    release.set()
    await hass.async_block_till_done()


@pytest.mark.parametrize("failure", [False, True])
async def test_native_handler_survives_timeout_and_logs_final_outcome(
    hass, slow_service, caplog, failure
):
    _, release, finished, state = slow_service
    state["fail"] = failure
    caplog.set_level(logging.INFO, logger="custom_components.occupied.actions")
    action = ResolvedAction("script.turn_on", ("script.clock",), {}, ("script.clock",), False)
    with pytest.raises(TimeoutError):
        await actions.dispatch_service(hass, action, Context())
    assert not state["cancelled"] and not finished.is_set()
    release.set()
    await hass.async_block_till_done()
    assert finished.is_set() and state["calls"] == 1
    records = [
        record for record in caplog.records if record.name == "custom_components.occupied.actions"
    ]
    assert any(
        ("failed" if failure else "completed") in record.getMessage()
        and "script.turn_on" in record.getMessage()
        for record in records
    )


async def test_cancelling_waiter_keeps_the_native_handler_running(hass, slow_service):
    entered, release, finished, state = slow_service
    action = ResolvedAction("script.turn_on", ("script.clock",), {}, ("script.clock",), False)
    waiter = asyncio.create_task(actions.dispatch_service(hass, action, Context()))
    await entered.wait()
    waiter.cancel()
    with pytest.raises(asyncio.CancelledError):
        await waiter
    assert not state["cancelled"]
    release.set()
    await hass.async_block_till_done()
    assert finished.is_set() and state["calls"] == 1


@pytest.fixture
async def runtime_engine(hass):
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    hass.states.async_set("switch.clock", "off")
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Slow native service",
            "steps": {
                "clock": {
                    "timing": {"absolute_time": {"start": "23:59:59"}},
                    "action": "switch.turn_on",
                    "entities": ["switch.clock"],
                }
            },
        }
    )
    engine = DailyEngine(hass, "service-timeout", program)
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        yield engine
    finally:
        await engine.async_close(cleanup=False)


async def test_runtime_wait_timeout_is_uncertain_and_never_retried(
    hass, slow_service, runtime_engine
):
    _, release, finished, state = slow_service
    engine = runtime_engine
    try:
        action = ResolvedAction("switch.turn_on", ("switch.clock",), {}, ("switch.clock",), True)
        assert not await engine._call(action, "slow-runtime", engine.generation)
        assert engine._journal["slow-runtime"]["status"] == "uncertain"
        assert not any(event.kind == "retry" for event in engine._queue)
        assert not state["cancelled"]
        release.set()
        await hass.async_block_till_done()
        assert finished.is_set() and state["calls"] == 1
        assert engine._journal["slow-runtime"]["status"] == "uncertain"
        assert not await engine._call(action, "slow-runtime", engine.generation)
        assert state["calls"] == 1
    finally:
        release.set()


@pytest.mark.parametrize("error", [ValueError("Native failure"), TimeoutError("Native timeout")])
async def test_native_errors_before_the_wait_deadline_keep_their_failure_semantics(
    hass, runtime_engine, error
):
    async def fail(call):
        raise error

    hass.services.async_register("switch", "turn_on", fail)
    action = ResolvedAction("switch.turn_on", ("switch.clock",), {}, ("switch.clock",), True)
    assert not await runtime_engine._call(action, "native-error", runtime_engine.generation)
    assert runtime_engine._journal["native-error"]["status"] == "failed"
    assert any(event.kind == "retry" for event in runtime_engine._queue)
