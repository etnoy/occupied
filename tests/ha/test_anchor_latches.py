"""Reached HA timestamps keep their remaining events through local midnight."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed


@pytest.fixture(autouse=True)
def anchor_clock(freezer):
    freezer.move_to("2026-10-13T16:59:00+00:00")


async def advance(hass, freezer, at):
    freezer.move_to(at)
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


def source(hass, kind, at):
    if kind == "calendar":
        hass.states.async_set("calendar.work", "off", {"start_time": at, "end_time": at})
    else:
        hass.states.async_set("sensor.next_alarm", at, {"device_class": "timestamp"})


async def load(
    hass,
    freezer,
    kind,
    program,
    *,
    timezone="UTC",
    at="2026-10-13T16:59:00+00:00",
    anchor="2026-10-13T17:00:00+00:00",
):
    await hass.config.async_set_time_zone(timezone)
    hass.set_state(CoreState.running)
    freezer.move_to(at)
    source(hass, kind, anchor)
    calls = []
    hass.states.async_set("switch.proof", "off")

    async def handle(call):
        calls.append(call)
        hass.states.async_set(
            "switch.proof", "on" if call.service == "turn_on" else "off", context=call.context
        )

    entry = MockConfigEntry(domain="occupied", title="Anchors", data={"program": program})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    hass.services.async_register("switch", "turn_on", handle)
    hass.services.async_register("switch", "turn_off", handle)
    await entry.runtime_data.async_set_enabled(True)
    return entry, calls


def timing(kind, offset="30m"):
    return {
        "relative_to": {
            "entity": "calendar.work" if kind == "calendar" else "sensor.next_alarm",
            **({"attribute": "end_time"} if kind == "calendar" else {}),
            "start_offset": offset,
        }
    }


@pytest.mark.parametrize("kind", ["calendar", "alarm"])
@pytest.mark.parametrize("restart", [False, True])
@pytest.mark.parametrize(
    "timezone,anchor,offset,expected",
    [
        ("UTC", "2026-10-13T23:00:00+00:00", "2h", "2026-10-14T01:00:00+00:00"),
        ("Europe/Stockholm", "2026-10-13T23:00:00+02:00", "2h", "2026-10-14T01:00:00+02:00"),
        ("Europe/Stockholm", "2026-03-28T23:00:00+01:00", "4h", "2026-03-29T04:00:00+02:00"),
        ("Europe/Stockholm", "2026-10-24T23:00:00+02:00", "4h", "2026-10-25T02:00:00+01:00"),
    ],
)
async def test_overnight_offset_survives_midnight(
    hass, freezer, kind, restart, timezone, anchor, offset, expected
):
    reached = datetime.fromisoformat(anchor)
    zone = ZoneInfo(timezone)
    program = {
        "schema_version": 1,
        "name": "Overnight anchors",
        "steps": {
            "after": {
                "timing": timing(kind, offset),
                "action": "turn_on",
                "entities": ["switch.proof"],
            }
        },
    }
    entry, calls = await load(
        hass,
        freezer,
        kind,
        program,
        timezone=timezone,
        at=reached - timedelta(minutes=1),
        anchor=anchor,
    )
    await advance(hass, freezer, reached + timedelta(milliseconds=1))
    tomorrow = reached.astimezone(zone) + timedelta(days=1)
    source(hass, kind, tomorrow.isoformat())
    await hass.async_block_till_done()
    midnight = tomorrow.replace(hour=0, minute=0)
    await advance(hass, freezer, midnight + timedelta(milliseconds=1))
    assert not calls
    if restart:
        freezer.move_to(midnight + timedelta(minutes=30))
        assert await hass.config_entries.async_reload(entry.entry_id)
        await hass.async_block_till_done()
    await advance(hass, freezer, datetime.fromisoformat(expected) + timedelta(milliseconds=1))
    assert [call.service for call in calls] == ["turn_on"]
    assert entry.runtime_data.active


@pytest.mark.parametrize("kind", ["calendar", "alarm"])
@pytest.mark.parametrize("restart", [False, True])
async def test_reached_anchor_survives_source_advancing(hass, freezer, kind, restart):
    program = {
        "schema_version": 1,
        "name": "Anchors",
        "steps": {
            "after": {"timing": timing(kind), "action": "turn_on", "entities": ["switch.proof"]}
        },
    }
    entry, calls = await load(hass, freezer, kind, program)
    await advance(hass, freezer, "2026-10-13T17:00:00+00:00")
    source(hass, kind, "2026-10-14T17:00:00+00:00")
    await hass.async_block_till_done()
    if restart:
        assert await hass.config_entries.async_reload(entry.entry_id)
        await hass.async_block_till_done()
    await advance(hass, freezer, "2026-10-13T17:30:01+00:00")
    assert [call.service for call in calls] == ["turn_on"]
    assert entry.runtime_data.active


async def test_calendar_state_only_change_keeps_plans(hass, freezer):
    program = {
        "schema_version": 1,
        "name": "Anchors",
        "steps": {
            "after": {
                "timing": timing("calendar"),
                "action": "turn_on",
                "entities": ["switch.proof"],
            }
        },
    }
    entry, _ = await load(hass, freezer, "calendar", program)
    engine = entry.runtime_data
    plans = tuple(engine._plans.values())
    hass.states.async_set(
        "calendar.work",
        "on",
        {"end_time": "2026-10-13T17:00:00+00:00", "start_time": "2026-10-14T09:00:00+00:00"},
    )
    await hass.async_block_till_done()
    assert tuple(engine._plans.values()) == plans
    assert all(a is b for a, b in zip(engine._plans.values(), plans, strict=True))


async def test_pre_instant_reschedule_still_moves_the_event(hass, freezer):
    program = {
        "schema_version": 1,
        "name": "Anchors",
        "steps": {
            "after": {
                "timing": timing("calendar"),
                "action": "turn_on",
                "entities": ["switch.proof"],
            }
        },
    }
    _, calls = await load(hass, freezer, "calendar", program)
    source(hass, "calendar", "2026-10-13T18:00:00+00:00")
    await hass.async_block_till_done()
    await advance(hass, freezer, "2026-10-13T17:30:01+00:00")
    assert not calls
    await advance(hass, freezer, "2026-10-13T18:30:01+00:00")
    assert [call.service for call in calls] == ["turn_on"]


async def test_random_window_off_survives_calendar_advancing(hass, freezer):
    program = {
        "schema_version": 1,
        "name": "Anchors",
        "random": {
            "evening": {
                "start": timing("calendar", "0s"),
                "end": {"duration": {"min": "1h"}},
                "count": 1,
                "min_duration": "10m",
                "max_duration": "10m",
                "on": {"action": "turn_on", "entities": ["switch.proof"]},
                "off": {"action": "turn_off", "entities": ["switch.proof"]},
            }
        },
    }
    entry, calls = await load(hass, freezer, "calendar", program)
    engine = entry.runtime_data
    events = sorted(event for event in engine._queue if event.kind == "plan")
    first = next(event for event in events if event.payload[1].action.action == "switch.turn_on")
    await advance(hass, freezer, first.at + timedelta(milliseconds=1))
    assert [call.service for call in calls] == ["turn_on"]
    source(hass, "calendar", "2026-10-14T17:00:00+00:00")
    await hass.async_block_till_done()
    await advance(hass, freezer, "2026-10-13T18:00:01+00:00")
    assert [call.service for call in calls] == ["turn_on", "turn_off"]


@pytest.mark.parametrize("kind", ["calendar", "alarm"])
async def test_saved_preview_uses_runtime_latches_without_mutating_them(
    hass, freezer, hass_ws_client, kind
):
    from copy import deepcopy

    program = {
        "schema_version": 1,
        "name": "Anchors",
        "steps": {
            "after": {"timing": timing(kind), "action": "turn_on", "entities": ["switch.proof"]}
        },
    }
    entry, _ = await load(hass, freezer, kind, program)
    await advance(hass, freezer, "2026-10-13T17:00:00.001+00:00")
    source(hass, kind, "2026-10-14T17:00:00+00:00")
    await hass.async_block_till_done()
    engine = entry.runtime_data
    before, version = deepcopy(engine._anchor_latches.snapshot()), engine._anchor_latches.version
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/preview",
            "config_entry_id": entry.entry_id,
            "date": "2026-10-13",
            "days": 1,
        }
    )
    result = (await client.receive_json())["result"]
    assert result["valid"]
    events = [event for plan in result["plans"] for event in plan["events"]]
    assert any("17:30:00" in event["time"] for event in events)
    assert engine._anchor_latches.snapshot() == before
    assert engine._anchor_latches.version == version
