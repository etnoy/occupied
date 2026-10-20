"""The displayed saved schedule must describe the controller's actual choices."""

from copy import deepcopy
from dataclasses import replace
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

from custom_components.occupied import engine_daily
from custom_components.occupied.preview import preview_draft
from custom_components.occupied.time_sources import planning_context
from custom_components.occupied.validation import program_data, validate_program

DAY = date(2026, 10, 20)


@pytest.fixture
async def saved_schedule(hass, freezer, hass_storage):
    freezer.move_to("2026-10-20T23:00:00+02:00")
    await hass.config.async_set_time_zone("Europe/Stockholm")
    hass.set_state(CoreState.running)
    entities = [f"light.example_{index}" for index in range(8)]
    program = {
        "schema_version": 1,
        "name": "Midnight schedule",
        "steps": {
            "evening": {
                "timing": {"absolute_time": {"start": "18:00"}},
                "action": "turn_on",
                "entities": entities,
            },
            "late_evening_lights": {
                "timing": {"absolute_time": {"start": "23:30", "end": "00:30"}},
                "action": "turn_off",
                "entities": entities,
                "stagger": {"enabled": True, "period": "2m"},
            },
        },
    }
    calls = []
    for entity in entities:
        hass.states.async_set(entity, "on", {"supported_color_modes": ["onoff"]})

    async def service(call):
        calls.append((dt_util.utcnow(), call.data["entity_id"], call.service))
        hass.states.async_set(
            call.data["entity_id"],
            "off" if call.service == "turn_off" else "on",
            {"supported_color_modes": ["onoff"]},
            context=call.context,
        )

    for service_name in ("turn_on", "turn_off"):
        hass.services.async_register("light", service_name, service)
    entry = MockConfigEntry(domain="occupied", title=program["name"], data={"program": program})
    entry.add_to_hass(hass)
    hass_storage[f"occupied.{entry.entry_id}.runtime"] = {"version": 1, "data": {"seed": "1"}}
    hass_storage[f"occupied.{entry.entry_id}.permission"] = {
        "version": 1,
        "data": {"enabled": True, "paused": False},
    }
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.runtime_data._seed == "1"
    assert not calls
    return entry, calls


async def preview(client, engine, day, *, request_id=1):
    await client.send_json(
        {
            "id": request_id,
            "type": "occupied/preview",
            "config_entry_id": engine.entry_id,
            "date": day.isoformat(),
        }
    )
    response = await client.receive_json()
    assert response["success"], response
    assert response["result"]["valid"], response
    return response["result"]


def tuesday_ticks(plan):
    return [
        event
        for event in plan["events"]
        if event["id"].startswith("2026-10-20:step:late_evening_lights:")
    ]


async def test_saved_preview_matches_midnight_dispatch_and_survives_reload(
    hass, freezer, saved_schedule, hass_ws_client
):
    entry, calls = saved_schedule
    engine = entry.runtime_data
    client = await hass_ws_client(hass)
    before = deepcopy(engine.snapshot())
    plans = dict(engine._plans)
    latches = deepcopy(engine._anchor_latches.snapshot())
    timer = engine._cancel_timer
    stored = await engine._store.async_load()

    # The old UI seed puts this very same occurrence on Tuesday.
    simulation = preview_draft(engine.program, DAY, 1, "preview-1", planning_context(hass))
    assert len(tuesday_ticks(simulation["plans"][0])) == 8
    yesterday = await preview(client, engine, DAY)
    today = await preview(client, engine, DAY + timedelta(days=1), request_id=2)
    assert yesterday["program"] == today["program"] == program_data(engine.program)
    assert not tuesday_ticks(yesterday["plans"][0])
    ticks = tuesday_ticks(today["plans"][0])
    expected = [
        event.to_dict(ZoneInfo("Europe/Stockholm"))
        for event in engine._plans[DAY].events
        if event.source_id == "late_evening_lights"
    ]
    assert ticks == expected
    assert len(ticks) == 8
    assert datetime.fromisoformat(ticks[0]["time"]) == engine.next_event
    assert engine.snapshot() == before
    assert engine._plans == plans
    assert engine._anchor_latches.snapshot() == latches
    assert engine._cancel_timer is timer
    assert await engine._store.async_load() == stored
    assert not calls

    # A refresh cannot resample the controller's choices.
    refreshed = await preview(client, engine, DAY + timedelta(days=1), request_id=3)
    assert refreshed == today
    assert await hass.config_entries.async_reload(entry.entry_id)
    engine = entry.runtime_data
    reloaded = await preview(client, engine, DAY + timedelta(days=1), request_id=4)
    assert reloaded == today
    await client.close()

    # Dispatch the actual midnight refresh and every tick advertised by Preview.
    for instant in ["2026-10-21T00:00:00+02:00", *[tick["time"] for tick in ticks]]:
        freezer.move_to(datetime.fromisoformat(instant) + timedelta(milliseconds=1))
        async_fire_time_changed(hass, dt_util.utcnow())
        await hass.async_block_till_done()
    assert [(entity, service) for _, entity, service in calls] == [
        (tick["action"]["entities"][0], "turn_off") for tick in ticks
    ]
    assert all(
        abs(at - datetime.fromisoformat(tick["time"])) < timedelta(milliseconds=10)
        for (at, _, _), tick in zip(calls, ticks, strict=True)
    )
    inputs = engine.preview_inputs()
    after = await hass.async_add_executor_job(inputs.render, DAY + timedelta(days=1), 1)
    assert tuesday_ticks(after["plans"][0]) == ticks


async def test_preview_cannot_accept_an_alternative_program_or_seed(
    hass, saved_schedule, hass_ws_client
):
    entry, calls = saved_schedule
    engine = entry.runtime_data
    draft = program_data(engine.program)
    draft["steps"]["late_evening_lights"]["timing"] = {"absolute_time": {"start": "23:40"}}
    before = deepcopy(engine.snapshot())
    plans = dict(engine._plans)
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/preview",
            "config_entry_id": entry.entry_id,
            "date": DAY.isoformat(),
            "program": draft,
            "seed": "other-seed",
        }
    )
    response = await client.receive_json()
    assert not response["success"]
    assert response["error"]["code"] == "invalid_format"
    result = await preview(client, engine, DAY, request_id=2)
    assert result["program"] == program_data(engine.program)
    assert engine.snapshot() == before
    assert engine._plans == plans
    assert not calls


async def test_saved_preview_reuses_compiled_context_for_cached_dates(
    hass, saved_schedule, hass_ws_client, monkeypatch
):
    entry, calls = saved_schedule
    engine = entry.runtime_data
    draft = program_data(engine.program)
    draft["steps"]["late_evening_lights"]["timing"] = {
        "relative_to": {"entity": "input_datetime.bedtime", "start_offset": "10m"}
    }
    attributes = {"has_time": True, "has_date": False}
    hass.states.async_set("input_datetime.bedtime", "23:30:00", attributes)
    await engine.async_replace_program(validate_program(draft))
    original = engine._plans[DAY]
    # A retained per-date plan can have older context than the snapshot used
    # to compile new dates. Change only Preview's input, without triggering a
    # separate runtime replan through an HA state-change listener.
    context = planning_context(hass)
    context = replace(
        context,
        time_sources={
            "input_datetime.bedtime": {
                **context.time_sources["input_datetime.bedtime"],
                "state": "23:45:00",
            }
        },
    )
    monkeypatch.setattr(engine_daily, "planning_context", lambda *_: context)
    client = await hass_ws_client(hass)
    result = await preview(client, engine, DAY)
    ticks = tuesday_ticks(result["plans"][0])
    assert ticks == [
        event.to_dict(ZoneInfo("Europe/Stockholm"))
        for event in original.events
        if event.source_id == "late_evening_lights"
    ]
    assert engine._plans[DAY] is original
    missing_day = max(engine._plans) + timedelta(days=3)
    projected = await preview(client, engine, missing_day, request_id=2)
    expected = preview_draft(
        engine.program,
        missing_day,
        1,
        engine._seed,
        engine.preview_inputs().context,
    )
    assert projected == {**expected, "program": program_data(engine.program)}
    assert missing_day not in engine._plans
    assert not calls


async def test_live_preview_freezes_the_saved_plan_shown_in_ui(
    hass, saved_schedule, hass_ws_client
):
    entry, calls = saved_schedule
    engine = entry.runtime_data
    client = await hass_ws_client(hass)
    result = await preview(client, engine, DAY + timedelta(days=1))
    await client.send_json(
        {
            "id": 2,
            "type": "occupied/live_preview/start",
            "config_entry_id": entry.entry_id,
            "date": "2026-10-21",
            "expected_plan_fingerprint": result["plan_fingerprint"],
            "request_id": "freeze-saved-plan",
        }
    )
    response = await client.receive_json()
    assert response["success"], response
    assert response["result"]["plan"] == result["plans"][0]
    assert engine.paused
    assert not calls


async def test_changed_saved_schedule_is_rejected_before_live_preview_pauses(
    hass, saved_schedule, hass_ws_client
):
    entry, calls = saved_schedule
    engine = entry.runtime_data
    client = await hass_ws_client(hass)
    result = await preview(client, engine, DAY + timedelta(days=1))
    engine._seed = "changed-schedule"
    engine._plans.clear()
    await client.send_json(
        {
            "id": 2,
            "type": "occupied/live_preview/start",
            "config_entry_id": entry.entry_id,
            "date": "2026-10-21",
            "expected_plan_fingerprint": result["plan_fingerprint"],
            "request_id": "reject-stale-plan",
        }
    )
    response = await client.receive_json()
    assert not response["success"]
    assert response["error"]["code"] == "schedule_changed"
    assert not engine.paused
    assert not calls
