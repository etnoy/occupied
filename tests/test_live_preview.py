"""Manual previews through real HA services, locking, storage and authentication."""

import asyncio
from copy import deepcopy
from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.exceptions import HomeAssistantError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.live_preview import LivePreviewError
from custom_components.occupied.planner import occurrence_groups, preview_calendar_dates
from custom_components.occupied.preview import preview_draft
from custom_components.occupied.time_sources import planning_context
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import validate_program


@pytest.fixture
def live_program():
    return {
        "schema_version": 1,
        "name": "Walk around",
        "steps": {
            "morning": {
                "name": "Morning",
                "timing": {"absolute_time": {"start": "08:00"}},
                "action": "turn_on",
                "entities": ["light.a", "light.b", "switch.a"],
            },
            "scene": {
                "timing": {"absolute_time": {"start": "23:00"}},
                "action": "scene.turn_on",
                "entities": ["scene.evening"],
            },
            "cover": {
                "timing": {"absolute_time": {"start": "23:00"}},
                "action": "cover.set_cover_position",
                "entities": ["cover.blind"],
                "data": {"position": 25},
            },
        },
    }


@pytest.fixture
async def live_engine(hass, live_program):
    await hass.config.async_set_time_zone("UTC")
    entry = MockConfigEntry(domain="occupied", title="Walk around", data={"program": live_program})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    return entry.runtime_data


@pytest.fixture
def live_calls(hass):
    calls = []
    for entity in ("light.a", "light.b", "switch.a", "scene.evening", "cover.blind"):
        hass.states.async_set(entity, "off", {"supported_color_modes": ["brightness"]})

    async def handler(call):
        calls.append(call)

    for domain, service in (
        ("light", "turn_on"),
        ("switch", "turn_on"),
        ("scene", "turn_on"),
        ("cover", "set_cover_position"),
    ):
        hass.services.async_register(domain, service, handler)
    return calls


async def start(engine, program, request="start", user="owner", day="2026-10-14"):
    preview = preview_draft(
        program, date.fromisoformat(day), 1, "preview-1", planning_context(engine.hass)
    )
    return await engine.live_preview.async_start(
        program,
        day,
        "preview-1",
        preview["plan_fingerprint"],
        request,
        user,
    )


async def next_event(engine, request="next", user="owner"):
    session = engine.live_preview.session
    return await engine.live_preview.async_next(
        session["id"],
        session["next_group"]["id"],
        request,
        user,
    )


async def test_start_idle_status_and_group_order_are_isolated(
    live_engine, live_program, live_calls
):
    engine = live_engine
    before = (engine._seed, deepcopy(engine._journal), deepcopy(engine._virtual), engine.program)
    await engine.async_set_dry_run(True)
    result = await start(engine, live_program)
    assert result["session"]["simulated_time"] is None
    assert result["session"]["total"] == 3
    assert not live_calls and engine.paused and not engine.enabled
    engine.live_preview.response("owner", frozen=True)
    first = await next_event(engine)
    assert len(live_calls) == 3 and first["session"]["cursor"] == 1
    assert all(call.context.user_id == "owner" for call in live_calls)
    await next_event(engine, "two")
    await next_event(engine, "three")
    assert [call.domain for call in live_calls] == ["light", "light", "switch", "cover", "scene"]
    assert live_calls[3].data["position"] == 25
    assert engine.live_preview.session["state"] == "completed" and engine.paused
    assert (engine._seed, engine._journal, engine._virtual, engine.program) == before
    await start(engine, live_program, "again")
    assert len(live_calls) == 5 and engine.live_preview.session["cursor"] == 0


async def test_duplicate_and_concurrent_advances_do_not_consume_next(
    live_engine, live_program, live_calls
):
    await start(live_engine, live_program)
    manager = live_engine.live_preview
    session_id, group_id = manager.session["id"], manager.session["next_group"]["id"]
    results = await asyncio.gather(
        manager.async_next(session_id, group_id, "one", "owner"),
        manager.async_next(session_id, group_id, "one", "owner"),
    )
    assert results[0] == results[1] and len(live_calls) == 3
    with pytest.raises(LivePreviewError, match="Event changed"):
        await manager.async_next(session_id, group_id, "different", "owner")
    duplicate = await start(live_engine, live_program)
    assert duplicate["session"]["id"] == session_id and manager.session["cursor"] == 1
    with pytest.raises(LivePreviewError, match="already running"):
        await start(live_engine, live_program, "new")
    await manager.async_stop(session_id)
    await start(live_engine, live_program, "new")
    with pytest.raises(LivePreviewError, match="already created"):
        await start(live_engine, live_program)


async def test_stop_during_native_call_prevents_remaining_dispatch(
    live_engine, live_program, live_calls
):
    entered, release = asyncio.Event(), asyncio.Event()

    async def blocking(call):
        live_calls.append(call)
        entered.set()
        await release.wait()

    live_engine.hass.services.async_register("light", "turn_on", blocking)
    await start(live_engine, live_program)
    advancing = asyncio.create_task(next_event(live_engine))
    await entered.wait()
    stopping = asyncio.create_task(
        live_engine.live_preview.async_stop(live_engine.live_preview.session["id"])
    )
    await asyncio.sleep(0)
    assert live_engine.live_preview.session["state"] == "stopping"
    release.set()
    await asyncio.gather(advancing, stopping)
    assert len(live_calls) == 1 and live_engine.paused
    assert live_engine.live_preview.session["state"] == "stopped"
    statuses = [
        outcome["status"] for outcome in live_engine.live_preview.session["outcomes"].values()
    ]
    assert statuses == ["dispatched", "cancelled", "cancelled"]


async def test_failures_and_unavailable_members_do_not_retry(live_engine, live_program, live_calls):
    live_engine.hass.states.async_set("light.b", "unavailable")

    async def fail(_call):
        raise HomeAssistantError("Device rejected action")

    live_engine.hass.services.async_register("light", "turn_on", fail)
    await start(live_engine, live_program)
    result = await next_event(live_engine)
    statuses = [value["status"] for value in result["session"]["outcomes"].values()]
    assert statuses == ["failed", "unavailable", "dispatched"]
    assert len(live_calls) == 1 and result["session"]["state"] == "ready"
    assert not live_engine._queue


async def test_pending_and_outcome_storage_failures_block_dispatch(
    live_engine, live_program, live_calls
):
    await start(live_engine, live_program)
    manager = live_engine.live_preview
    with patch.object(
        manager.store, "async_save", AsyncMock(side_effect=HomeAssistantError("disk full"))
    ):
        result = await next_event(live_engine)
    assert not live_calls and result["session"]["state"] == "interrupted"
    with pytest.raises(LivePreviewError, match="unavailable"):
        await next_event(live_engine, "new")


async def test_restart_marks_pending_uncertain_and_retains_pause(
    live_engine, live_program, live_calls
):
    await start(live_engine, live_program)
    manager = live_engine.live_preview
    event = manager.groups[0][0]
    manager.session["state"] = "executing"
    manager.session["outcomes"][event.id] = {
        "group_id": event.group_id,
        "status": "pending",
        "detail": "pending",
    }
    await manager._persist()
    recovered = DailyEngine(live_engine.hass, live_engine.entry_id, live_engine.program)
    await recovered.async_prepare()
    assert recovered.paused and recovered.live_preview.session["state"] == "interrupted"
    assert recovered.live_preview.session["outcomes"][event.id]["status"] == "uncertain"
    assert not live_calls
    await recovered.async_close()


async def test_freeze_and_changed_context_rejection(live_engine, live_program, live_calls):
    program = deepcopy(live_program)
    program["steps"]["morning"]["timing"] = {"relative_to": {"entity": "input_datetime.wake"}}
    hass = live_engine.hass
    hass.states.async_set("input_datetime.wake", "08:00:00", {"has_time": True, "has_date": False})
    preview = preview_draft(program, date(2026, 10, 14), 1, "preview-1", planning_context(hass))
    hass.states.async_set("input_datetime.wake", "09:00:00", {"has_time": True, "has_date": False})
    with pytest.raises(LivePreviewError, match="Schedule changed"):
        await live_engine.live_preview.async_start(
            program, "2026-10-14", "preview-1", preview["plan_fingerprint"], "old", "owner"
        )
    await start(live_engine, program)
    frozen = live_engine.live_preview.plan.to_dict()
    hass.states.async_set("input_datetime.wake", "10:00:00", {"has_time": True, "has_date": False})
    await live_engine.async_replace_program(validate_program(live_program | {"name": "Edited"}))
    assert live_engine.live_preview.plan.to_dict() == frozen
    assert live_engine.live_preview.snapshot()["earlier_revision"]
    await next_event(live_engine)
    assert len(live_calls) == 3


@pytest.mark.parametrize("control", ["resume", "stop", "unload"])
async def test_controller_controls_terminate_live_session(
    live_engine, live_program, live_calls, control
):
    await start(live_engine, live_program)
    if control == "resume":
        await live_engine.async_set_paused(False)
        assert not live_engine.paused and not live_engine.enabled
    elif control == "stop":
        await live_engine.async_set_enabled(False)
        assert live_engine.paused
    else:
        await live_engine.async_close()
    assert not live_engine.live_preview.running and not live_calls


async def test_overlap_is_checked_at_start_and_each_advance(live_engine, live_program, live_calls):
    other_entry = MockConfigEntry(domain="occupied", title="Other", data={"program": live_program})
    other_entry.add_to_hass(live_engine.hass)
    assert await live_engine.hass.config_entries.async_setup(other_entry.entry_id)
    other = other_entry.runtime_data
    await start(other, live_program)
    with pytest.raises(LivePreviewError, match="overlapping entities"):
        await start(live_engine, live_program)
    await other.live_preview.async_stop(other.live_preview.session["id"])
    await start(live_engine, live_program)
    other.active = True
    with pytest.raises(LivePreviewError, match="overlapping entities"):
        await next_event(live_engine)
    assert not live_calls


async def test_owner_and_admin_commands(
    live_engine, live_program, live_calls, hass_ws_client, hass_read_only_access_token
):
    manager = live_engine.live_preview
    await start(live_engine, live_program)
    with pytest.raises(LivePreviewError, match="session owner"):
        await next_event(live_engine, user="other")
    client = await hass_ws_client(live_engine.hass)
    await client.send_json(
        {"id": 1, "type": "occupied/live_preview/status", "config_entry_id": live_engine.entry_id}
    )
    result = await client.receive_json()
    assert result["success"] and not result["result"]["can_advance"]
    assert result["result"]["plan"]["events"]
    await client.send_json(
        {
            "id": 2,
            "type": "occupied/live_preview/stop",
            "config_entry_id": live_engine.entry_id,
            "session_id": manager.session["id"],
        }
    )
    assert (await client.receive_json())["success"]
    reader = await hass_ws_client(live_engine.hass, access_token=hass_read_only_access_token)
    await reader.send_json(
        {"id": 1, "type": "occupied/live_preview/status", "config_entry_id": live_engine.entry_id}
    )
    assert (await reader.receive_json())["error"]["code"] == "unauthorized"
    assert not live_calls


def test_occurrence_identity_random_phases_overnight_and_dst(live_program):
    program = deepcopy(live_program)
    program["random"] = {
        "morning": {
            "start": {"absolute_time": {"start": "23:00"}},
            "end": {"duration": {"min": "2h"}},
            "count": 2,
            "min_duration": "10m",
            "max_duration": "10m",
            "on": {"action": "turn_on", "entities": ["light.a", "switch.a"]},
            "off": {"action": "turn_off", "entities": ["light.a", "switch.a"]},
        },
    }
    plans = preview_calendar_dates(
        validate_program(program),
        [date(2026, 10, 25)],
        "preview-1",
        context=PlanningContext("Europe/Stockholm"),
    )
    groups = occurrence_groups(plans[0])
    assert (plans[0].end - plans[0].start).total_seconds() == 25 * 3600
    assert len({group[0].group_id for group in groups}) == len(groups)
    assert all(len({event.group_id for event in group}) == 1 for group in groups)
    assert any(group[0].id.startswith("2026-10-24:random:") for group in groups)
    assert {group[0].kind for group in groups} == {"step", "random_start", "random_end"}


async def test_native_timeout_is_uncertain_without_retry(live_engine, live_program, live_calls):
    async def timeout(*_args, **_kwargs):
        raise TimeoutError

    await start(live_engine, live_program)
    with patch("custom_components.occupied.live_preview.dispatch_service", timeout):
        result = await next_event(live_engine)
    assert {outcome["status"] for outcome in result["session"]["outcomes"].values()} == {
        "uncertain"
    }
    assert not live_calls and not live_engine._queue


async def test_admin_websocket_start_and_next_are_idempotent(
    live_engine, live_program, live_calls, hass_ws_client
):
    preview = preview_draft(
        live_program, date(2026, 10, 14), 1, "preview-1", planning_context(live_engine.hass)
    )
    client = await hass_ws_client(live_engine.hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/live_preview/start",
            "config_entry_id": live_engine.entry_id,
            "program": live_program,
            "date": "2026-10-14",
            "seed": "preview-1",
            "expected_plan_fingerprint": preview["plan_fingerprint"],
            "request_id": "start",
        }
    )
    started = await client.receive_json()
    assert started["success"] and started["result"]["can_advance"]
    session = started["result"]["session"]
    assert not live_calls
    advance = {
        "type": "occupied/live_preview/next",
        "config_entry_id": live_engine.entry_id,
        "session_id": session["id"],
        "expected_group_id": session["next_group"]["id"],
        "request_id": "advance",
    }
    await client.send_json({"id": 2, **advance})
    result = await client.receive_json()
    await client.send_json({"id": 3, **advance})
    repeated = await client.receive_json()
    assert result["result"] == repeated["result"] and len(live_calls) == 3
    await client.send_json({"id": 4, **advance, "expected_group_id": "wrong"})
    assert (await client.receive_json())["error"]["code"] == "request_conflict"
    await live_engine.live_preview.async_stop(session["id"])
    await client.send_json({"id": 5, **advance})
    repeated = await client.receive_json()
    assert repeated["result"]["session"]["state"] == "stopped"
    assert len(repeated["result"]["call_outcomes"]) == 3 and len(live_calls) == 3


@pytest.mark.parametrize(
    "command,extra",
    [
        (
            "start",
            {
                "program": {},
                "date": "2026-10-14",
                "seed": "preview-1",
                "expected_plan_fingerprint": "x",
                "request_id": "start",
            },
        ),
        ("next", {"session_id": "x", "expected_group_id": "x", "request_id": "next"}),
        ("stop", {"session_id": "x"}),
    ],
)
async def test_mutating_commands_require_admin(
    live_engine, live_calls, hass_ws_client, hass_read_only_access_token, command, extra
):
    client = await hass_ws_client(live_engine.hass, access_token=hass_read_only_access_token)
    await client.send_json(
        {
            "id": 1,
            "type": f"occupied/live_preview/{command}",
            "config_entry_id": live_engine.entry_id,
            **extra,
        }
    )
    assert (await client.receive_json())["error"]["code"] == "unauthorized"
    assert not live_calls


async def test_empty_and_infeasible_days_cannot_start(live_engine, live_calls):
    empty = {"schema_version": 1, "name": "Empty"}
    with pytest.raises(LivePreviewError, match="nonempty"):
        await start(live_engine, empty)
    infeasible = {
        "schema_version": 1,
        "name": "Infeasible",
        "random": {
            "short": {
                "start": {"absolute_time": {"start": "18:00"}},
                "end": {"duration": {"min": "1m"}},
                "count": 1,
                "min_duration": "2m",
                "max_duration": "2m",
                "on": {"action": "turn_on", "entities": ["light.a"]},
                "off": {"action": "turn_off", "entities": ["light.a"]},
            }
        },
    }
    with pytest.raises(LivePreviewError, match="feasible"):
        await start(live_engine, infeasible)
    assert not live_calls and not live_engine.paused


async def test_outcome_write_failure_retains_known_result_and_stops_members(
    live_engine, live_program, live_calls
):
    await start(live_engine, live_program)
    manager = live_engine.live_preview
    save = manager.store.async_save
    writes = 0

    async def fail_after_dispatch(data):
        nonlocal writes
        writes += 1
        if writes >= 2:
            raise HomeAssistantError("Disk full after native call")
        await save(data)

    with patch.object(manager.store, "async_save", fail_after_dispatch):
        result = await next_event(live_engine)
    assert len(live_calls) == 1 and result["session"]["state"] == "interrupted"
    assert [value["status"] for value in result["call_outcomes"].values()] == [
        "dispatched",
        "cancelled",
        "cancelled",
    ]
    recovered = DailyEngine(live_engine.hass, live_engine.entry_id, live_engine.program)
    await recovered.async_prepare()
    assert {
        outcome["status"] for outcome in recovered.live_preview.session["outcomes"].values()
    } == {"uncertain"}
    assert recovered.paused
    await recovered.async_close()


async def test_unresolved_configuration_and_disabled_entities(
    live_engine, live_program, live_calls
):
    from homeassistant.helpers import entity_registry as er

    registry = er.async_get(live_engine.hass)
    entity = registry.async_get_or_create(
        "light", "test", "disabled", disabled_by=er.RegistryEntryDisabler.USER
    )
    live_program = deepcopy(live_program)
    live_program["steps"]["morning"]["entities"][0] = entity.entity_id
    await start(live_engine, live_program)
    result = await next_event(live_engine)
    assert {value["status"] for value in result["call_outcomes"].values()} == {
        "entity_disabled",
        "dispatched",
    }
    assert len(live_calls) == 2
    live_engine.configuration_ready = False
    with pytest.raises(LivePreviewError, match="unavailable"):
        await next_event(live_engine, "new")
    assert live_engine.live_preview.session["state"] == "interrupted"


async def test_explicit_resume_after_interruption_survives_restart(
    live_engine, live_program, live_calls
):
    await start(live_engine, live_program)
    live_engine.live_preview.invalidate("Interrupted", interrupted=True)
    await live_engine.live_preview._persist()
    await live_engine.async_set_paused(False)
    recovered = DailyEngine(live_engine.hass, live_engine.entry_id, live_engine.program)
    await recovered.async_prepare()
    assert not recovered.paused
    assert recovered.live_preview.session["state"] == "interrupted"
    assert not live_calls
    await recovered.async_close()
