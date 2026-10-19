"""A bounded service wait must not cancel or replay an in-flight native handler."""

import asyncio
import logging

import pytest
from homeassistant.core import Context, CoreState
from homeassistant.exceptions import HomeAssistantError

from custom_components.occupied import actions
from custom_components.occupied.const import EVENT_ACTION
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


@pytest.mark.parametrize("failure", [False, True])
async def test_runtime_wait_timeout_is_uncertain_and_never_retried(
    hass, slow_service, runtime_engine, failure
):
    _, release, finished, state = slow_service
    engine = runtime_engine
    state["fail"] = failure
    logs = []
    hass.bus.async_listen(EVENT_ACTION, logs.append)
    try:
        action = ResolvedAction("switch.turn_on", ("switch.clock",), {}, ("switch.clock",), True)
        assert not await engine._call(action, "slow-runtime", engine.generation)
        assert engine._journal["slow-runtime"]["status"] == "uncertain"
        assert not any(event.kind == "retry" for event in engine._queue)
        assert not state["cancelled"]
        context_id = engine._journal["slow-runtime"]["context"]
        release.set()
        await hass.async_block_till_done()
        assert finished.is_set() and state["calls"] == 1
        assert engine._journal["slow-runtime"]["status"] == ("failed" if failure else "dispatched")
        assert len(logs) == (0 if failure else 1)
        if logs:
            assert logs[0].context.id == context_id
        saved = await engine._store.async_load()
        assert saved["journal"]["slow-runtime"]["status"] == ("failed" if failure else "dispatched")
        assert await engine._call(action, "slow-runtime", engine.generation) == (not failure)
        restored = DailyEngine(hass, engine.entry_id, engine.program)
        try:
            await restored.async_prepare()
            assert restored._journal["slow-runtime"]["status"] == (
                "failed" if failure else "dispatched"
            )
            assert await restored._call(action, "slow-runtime", restored.generation) == (
                not failure
            )
        finally:
            await restored.async_close(cleanup=False)
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


@pytest.mark.parametrize("change", ["close", "prune", "context", "status", "replace"])
async def test_stale_late_result_does_not_change_the_journal(
    hass, slow_service, runtime_engine, change
):
    from copy import deepcopy

    _, release, _, _ = slow_service
    engine = runtime_engine
    action = ResolvedAction("switch.turn_on", ("switch.clock",), {}, ("switch.clock",), True)
    logs = []
    hass.bus.async_listen(EVENT_ACTION, logs.append)
    assert not await engine._call(action, "stale", engine.generation)
    if change == "close":
        await engine.async_close(cleanup=False)
    elif change == "prune":
        engine._journal.pop("stale")
    elif change == "context":
        engine._journal["stale"]["context"] = "replacement-context"
    elif change == "status":
        engine._journal["stale"]["status"] = "dispatched"
    else:
        await engine.async_replace_program(
            engine.program.model_copy(update={"name": "Replacement"})
        )
    before = deepcopy(engine._journal)
    release.set()
    await hass.async_block_till_done()
    assert engine._journal == before and not logs


async def test_late_success_does_not_resume_a_stopped_custom_block(
    hass, slow_service, runtime_engine
):
    _, release, _, state = slow_service
    engine = runtime_engine
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Slow custom block",
            "steps": {
                "block": {
                    "timing": {"absolute_time": {"start": "23:59:59"}},
                    "actions": [
                        {"action": "script.turn_on", "entities": ["script.clock"]},
                        {"action": "switch.turn_on", "entities": ["switch.clock"]},
                    ],
                }
            },
        }
    )
    await engine.async_replace_program(program)
    plan = engine._plans[max(engine._plans)]
    event = plan.events[0]
    async with engine._lock:
        await engine._execute_custom_group(plan, event, engine.generation)
    assert state["calls"] == 1
    assert any(entry["status"] == "blocked" for entry in engine._journal.values())
    release.set()
    await hass.async_block_till_done()
    async with engine._lock:
        await engine._execute_custom_group(plan, event, engine.generation)
    assert state["calls"] == 1
