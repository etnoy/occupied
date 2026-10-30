"""Observed illuminance drives normal journaled Step dispatch, using fake devices."""

from copy import deepcopy
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.core import CoreState
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

ATTRS = {"device_class": "illuminance", "unit_of_measurement": "lx"}


def program(*, stable="1m", fallback="run", delay="0s", direction="above"):
    return {
        "schema_version": 1,
        "name": "Lux runtime",
        "steps": {
            "lights": {
                "timing": {
                    "lux": {
                        "entity_id": "sensor.outdoor",
                        direction: 400,
                        "for": stable,
                        "delay": {"min": delay},
                        "fallback": fallback,
                        "window": {
                            "start": {"absolute_time": {"start": "06:00"}},
                            "end": {"absolute_time": {"start": "09:00"}},
                        },
                    }
                },
                "action": "turn_off",
                "entities": ["switch.window"],
            },
            "child": {
                "timing": {"relative_to": {"step": "lights", "start_offset": "1m"}},
                "action": "turn_on",
                "entities": ["switch.child"],
            },
        },
    }


async def advance(hass, freezer, seconds=0.001):
    freezer.move_to(dt_util.utcnow() + timedelta(seconds=seconds))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


async def load(hass, freezer, raw=None, at="2026-10-30T06:00:00+00:00", reading="500"):
    freezer.move_to(at)
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    hass.states.async_set("sensor.outdoor", reading, ATTRS)
    hass.states.async_set("switch.window", "on")
    hass.states.async_set("switch.child", "off")
    calls = []

    async def handle(call):
        calls.append(call.service)
        for entity in (
            [call.data["entity_id"]]
            if isinstance(call.data["entity_id"], str)
            else call.data["entity_id"]
        ):
            hass.states.async_set(
                entity, "off" if call.service == "turn_off" else "on", context=call.context
            )

    entry = MockConfigEntry(
        domain="occupied", title="Lux runtime", data={"program": raw or program()}
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    hass.services.async_register("switch", "turn_on", handle)
    hass.services.async_register("switch", "turn_off", handle)
    engine = entry.runtime_data
    await engine.async_set_enabled(True)
    await advance(hass, freezer)
    return entry, calls


async def test_qualifies_once_then_resolves_child(hass, freezer):
    entry, calls = await load(hass, freezer)
    assert not calls and entry.runtime_data.active
    assert entry.runtime_data.snapshot()["lux"]["pending"]
    await advance(hass, freezer, 61)
    await advance(hass, freezer)
    assert calls == ["turn_off"]
    await advance(hass, freezer, 61)
    assert calls == ["turn_off", "turn_on"]
    hass.states.async_set("sensor.outdoor", "300", ATTRS)
    hass.states.async_set("sensor.outdoor", "500", ATTRS)
    await advance(hass, freezer, 120)
    assert calls == ["turn_off", "turn_on"]


@pytest.mark.parametrize("reading", ["400", "unavailable", "300"])
async def test_false_or_unavailable_resets_delay(hass, freezer, reading):
    entry, calls = await load(hass, freezer, program(delay="1m"))
    await advance(hass, freezer, 61)
    hass.states.async_set("sensor.outdoor", reading, ATTRS)
    await hass.async_block_till_done()
    await advance(hass, freezer, 61)
    assert not calls
    hass.states.async_set("sensor.outdoor", "500", ATTRS)
    await hass.async_block_till_done()
    await advance(hass, freezer)
    await advance(hass, freezer, 121)
    await advance(hass, freezer)
    assert calls == ["turn_off"]
    assert entry.runtime_data.active


@pytest.mark.parametrize("fallback,expected", [("run", ["turn_off"]), ("skip", [])])
async def test_deadline_with_unavailable_sensor(hass, freezer, fallback, expected):
    entry, calls = await load(hass, freezer, program(fallback=fallback), reading="unavailable")
    await advance(hass, freezer, 10800)
    await advance(hass, freezer)
    assert calls == expected
    assert entry.runtime_data.snapshot()["lux"]["resolved"]["2026-10-30:lights"]["reason"] in {
        "fallback",
        "skipped",
    }


async def test_restart_restarts_qualification_and_never_replays(hass, freezer):
    entry, calls = await load(hass, freezer)
    await advance(hass, freezer, 40)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    await advance(hass, freezer)
    await advance(hass, freezer, 30)
    assert not calls
    await advance(hass, freezer, 31)
    await advance(hass, freezer)
    assert calls == ["turn_off"]
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    await advance(hass, freezer, 120)
    assert calls.count("turn_off") == 1


async def test_enable_after_window_does_not_catch_up(hass, freezer):
    entry, calls = await load(hass, freezer, at="2026-10-30T10:00:00+00:00")
    await advance(hass, freezer, 120)
    assert not calls
    assert (
        entry.runtime_data.snapshot()["lux"]["resolved"]["2026-10-30:lights"]["reason"] == "missed"
    )


async def test_pause_discards_unobserved_stability(hass, freezer):
    entry, calls = await load(hass, freezer)
    await advance(hass, freezer, 40)
    await entry.runtime_data.async_set_paused(True)
    await advance(hass, freezer, 120)
    assert not calls
    await entry.runtime_data.async_set_paused(False)
    await advance(hass, freezer)
    await advance(hass, freezer, 30)
    assert not calls
    await advance(hass, freezer, 31)
    await advance(hass, freezer)
    assert calls == ["turn_off"]


@pytest.mark.parametrize("cloud_minutes", [0, 20])
async def test_cloudy_morning_runs_later_and_evening_uses_below(hass, freezer, cloud_minutes):
    entry, calls = await load(hass, freezer, reading="300" if cloud_minutes else "500")
    if cloud_minutes:
        await advance(hass, freezer, cloud_minutes * 60)
        assert not calls
        hass.states.async_set("sensor.outdoor", "500", ATTRS)
        await hass.async_block_till_done()
    await advance(hass, freezer, 61)
    await advance(hass, freezer)
    assert calls == ["turn_off"]
    at = entry.runtime_data._lux.records["2026-10-30:lights"]["at"]
    assert at.startswith(f"2026-10-30T06:{cloud_minutes + 1:02d}")


async def test_unavailable_report_at_deadline_does_not_cancel_fallback(hass, freezer):
    entry, calls = await load(hass, freezer, reading="300")
    freezer.move_to("2026-10-30T09:00:00.001000+00:00")
    hass.states.async_set("sensor.outdoor", "unavailable", ATTRS)
    await hass.async_block_till_done()
    await advance(hass, freezer)
    assert calls == ["turn_off"]
    assert entry.runtime_data._lux.records["2026-10-30:lights"]["reason"] == "fallback"


@pytest.mark.parametrize("mode,at", [("threshold", "06:01"), ("fallback", "09:00")])
async def test_manual_preview_simulates_without_consuming_production(hass, freezer, mode, at):
    entry, calls = await load(hass, freezer, reading="300")
    engine = entry.runtime_data
    before = deepcopy(engine._lux.records)
    inputs = engine.preview_inputs()
    preview = inputs.render(date(2026, 10, 30), 1)
    result = await engine.live_preview.async_start(
        "2026-10-30", preview["plan_fingerprint"], "lux-start", "owner", mode
    )
    assert engine.paused and result["session"]["state"] == "ready"
    assert result["plan"]["steps"]["lights"].startswith(f"2026-10-30T{at}")
    assert engine._lux.records == before
    session = engine.live_preview.session
    await engine.live_preview.async_next(
        session["id"], session["next_group"]["id"], "next-lux", "owner"
    )
    assert calls == ["turn_off"]
    assert engine._lux.records == before


async def test_evening_below_and_unrelated_step_keep_running(hass, freezer):
    raw = program(direction="below")
    raw["steps"]["unrelated"] = {
        "timing": {"absolute_time": {"start": "06:01"}},
        "action": "turn_on",
        "entities": ["switch.child"],
    }
    entry, calls = await load(hass, freezer, raw, reading="500")
    await advance(hass, freezer, 61)
    assert calls == ["turn_on"] and entry.runtime_data.active
    hass.states.async_set("sensor.outdoor", "100", ATTRS)
    await hass.async_block_till_done()
    await advance(hass, freezer, 61)
    await advance(hass, freezer)
    assert calls == ["turn_on", "turn_off"]


async def test_random_delay_phase_updates_without_new_sensor_report(hass, freezer):
    entry, calls = await load(hass, freezer, program(delay="1m"))
    await advance(hass, freezer, 61)
    assert not calls
    pending = entry.runtime_data.snapshot()["lux"]["pending"]
    assert (
        next(item for item in pending if item["source_date"] == "2026-10-30")["status"]
        == "random_delay"
    )


async def test_persistence_failure_closes_gate_before_dispatch(hass, freezer):
    entry, calls = await load(hass, freezer)
    with patch.object(
        entry.runtime_data._store,
        "async_save",
        AsyncMock(side_effect=HomeAssistantError("storage full")),
    ):
        await advance(hass, freezer, 61)
        assert not calls
        assert not entry.runtime_data.active
        assert entry.runtime_data.status == "error"


async def test_two_steps_share_one_sensor_and_resolve_once(hass, freezer):
    raw = program()
    raw["steps"].pop("child")
    raw["steps"]["second"] = deepcopy(raw["steps"]["lights"])
    raw["steps"]["second"]["entities"] = ["switch.child"]
    entry, calls = await load(hass, freezer, raw)
    await advance(hass, freezer, 61)
    await advance(hass, freezer)
    assert calls == ["turn_off", "turn_off"]
    assert entry.runtime_data._lux.records["2026-10-30:second"]["reason"] == "lux"
    await advance(hass, freezer, 10800)
    assert calls == ["turn_off", "turn_off"]
