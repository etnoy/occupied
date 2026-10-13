"""Daily steps through real HA timers, storage, services, and state listeners."""

from datetime import timedelta

import pytest
import voluptuous as vol
from homeassistant.components.light import LightEntityFeature
from homeassistant.core import CoreState
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

from custom_components.occupied.storage import plan_from_data
from custom_components.occupied.validation import program_revision, validate_program


@pytest.fixture
def runtime_program():
    return {
        "schema_version": 1,
        "name": "Daily house",
        "steps": {
            "on": {
                "timing": {"absolute_time": {"start": "18:01"}},
                "action": "turn_on",
                "entities": ["light.proof"],
            },
            "off": {
                "timing": {"relative_to": {"step": "on", "start_offset": "4m"}},
                "action": "turn_off",
                "entities": ["light.proof"],
            },
            "script": {
                "timing": {"absolute_time": {"start": "18:02"}},
                "action": "script.turn_on",
                "entities": ["script.test"],
                "data": {"variables": {"message": "hello"}},
            },
        },
    }


@pytest.fixture
def daily_entry(hass, runtime_program):
    entry = MockConfigEntry(
        domain="occupied",
        title="Daily house",
        data={"name": "Daily house", "source": "gui", "program": runtime_program},
    )
    entry.add_to_hass(hass)
    return entry


@pytest.fixture
def daily_devices(hass):
    calls = []
    hass.states.async_set(
        "light.proof",
        "off",
        {
            "brightness": 100,
            "supported_color_modes": ["brightness"],
            "supported_features": LightEntityFeature.TRANSITION,
        },
    )
    hass.states.async_set("script.test", "off")

    async def handle(call):
        calls.append(call)
        ids = call.data["entity_id"]
        for entity in ids if isinstance(ids, list) else [ids]:
            old = hass.states.get(entity)
            attrs = dict(old.attributes) if old else {}
            attrs.update(
                {
                    key: value
                    for key, value in call.data.items()
                    if key in {"brightness", "color_temp_kelvin", "hs_color", "rgb_color"}
                }
            )
            if "brightness_pct" in call.data:
                attrs["brightness"] = round(call.data["brightness_pct"] * 255 / 100)
            hass.states.async_set(
                entity, "on" if call.service == "turn_on" else "off", attrs, context=call.context
            )

    for domain in ("light", "switch", "script", "scene"):
        for service in ("turn_on", "turn_off"):
            hass.services.async_register(
                domain,
                service,
                handle,
                schema=vol.Schema(
                    {vol.Required("entity_id"): cv.entity_ids}, extra=vol.ALLOW_EXTRA
                ),
            )
    return calls


async def load(hass, entry, freezer, at="2026-10-13T18:00:00+00:00"):
    freezer.move_to(at)
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry.runtime_data


async def advance(hass, freezer, seconds):
    freezer.move_to(dt_util.utcnow() + timedelta(seconds=seconds))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


async def test_activation_before_first_step_does_not_invent_initial_state(
    hass, daily_entry, daily_devices, freezer
):
    hass.states.async_set(
        "light.proof", "on", {"brightness": 37, "supported_color_modes": ["brightness"]}
    )
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    assert engine.active and not engine._handover and not daily_devices
    assert hass.states.get("light.proof").attributes["brightness"] == 37


async def test_dispatch_and_relative_off_have_no_hidden_brightness(
    hass, daily_entry, daily_devices, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert hass.states.get("light.proof").state == "on", engine.snapshot()
    assert (
        "brightness" not in daily_devices[0].data and "brightness_pct" not in daily_devices[0].data
    )
    await advance(hass, freezer, 240)
    assert hass.states.get("light.proof").state == "off"
    assert [c.domain for c in daily_devices].count("script") == 1


async def test_late_activation_reconciles_known_state_without_replaying_generic_services(
    hass, daily_entry, daily_devices, freezer, runtime_program
):
    daily_entry.data["program"]["steps"]["off"]["timing"]["relative_to"]["start_offset"] = "30m"
    engine = await load(hass, daily_entry, freezer, "2026-10-13T18:03:00+00:00")
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 0)
    assert any(c.domain == "light" for c in daily_devices)
    assert not any(c.domain == "script" for c in daily_devices)
    assert all("brightness" not in c.data and "brightness_pct" not in c.data for c in daily_devices)
    assert engine._handover


async def test_manual_control_yields_until_new_activation(
    hass, daily_entry, daily_devices, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    hass.states.async_set("light.proof", "off")
    await hass.async_block_till_done()
    assert "light.proof" in engine._yielded
    await advance(hass, freezer, 240)
    assert len([c for c in daily_devices if c.domain == "light"]) == 1
    await engine.async_set_enabled(False)
    await engine.async_set_enabled(True)
    assert not engine._yielded


async def test_dry_run_uses_virtual_states_and_leaves_devices_alone(
    hass, daily_entry, daily_devices, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_dry_run(True)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert not daily_devices and hass.states.get("light.proof").state == "off"
    assert engine._virtual["light.proof"]["state"] == "on"
    assert any(v["status"] == "would_dispatch" for v in engine._journal.values())


async def test_metadata_apply_preserves_generation_and_plans(
    hass, daily_entry, daily_devices, freezer, runtime_program
):
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    plans = dict(engine._plans)
    generation = engine.generation
    session = engine.session
    runtime_program["name"] = "New controller"
    runtime_program["steps"]["on"]["name"] = "New title"
    runtime_program["steps"] = dict(reversed(runtime_program["steps"].items()))
    await engine.async_replace_program(validate_program(runtime_program))
    assert engine._plans == plans and engine.generation == generation and engine.session == session
    assert not daily_devices


async def test_restart_retains_sampled_plans_and_does_not_replay(
    hass, daily_entry, daily_devices, freezer
):
    daily_entry.data["program"]["steps"]["off"]["timing"]["relative_to"]["start_offset"] = "30m"
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 120)
    plans = {d: p.to_dict() for d, p in engine._plans.items()}
    assert all(plan_from_data(p).to_dict() == p for p in plans.values())
    before = len(daily_devices)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    await hass.async_block_till_done()
    restarted = daily_entry.runtime_data
    assert {d: p.to_dict() for d, p in restarted._plans.items()} == plans
    await advance(hass, freezer, 0)
    assert len(daily_devices) == before


async def test_permission_and_pause_cancel_future_dispatch(
    hass, daily_entry, daily_devices, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await engine.async_set_paused(True)
    await advance(hass, freezer, 121)
    assert not daily_devices and not engine.active
    await engine.async_set_paused(False)
    await advance(hass, freezer, 0)
    assert not any(c.domain == "script" for c in daily_devices)


async def test_storage_failure_blocks_calls(hass, daily_entry, daily_devices, freezer, monkeypatch):
    from homeassistant.exceptions import HomeAssistantError

    engine = await load(hass, daily_entry, freezer)

    async def fail(data):
        raise HomeAssistantError("Disk full")

    monkeypatch.setattr(engine._store, "async_save", fail)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 121)
    assert not daily_devices and not engine.active and engine._storage_failed


async def test_time_source_changes_reschedule_without_replaying_completed_steps(
    hass, daily_entry, daily_devices, freezer, runtime_program
):
    runtime_program["steps"]["on"]["timing"] = {"relative_to": {"entity": "input_datetime.alarm"}}
    engine = await load(hass, daily_entry, freezer)
    hass.states.async_set("input_datetime.alarm", "18:03:00", {"has_time": True, "has_date": False})
    await engine.async_replace_program(validate_program(runtime_program))
    await engine.async_set_enabled(True)
    hass.states.async_set("input_datetime.alarm", "18:01:00", {"has_time": True, "has_date": False})
    await hass.async_block_till_done()
    await advance(hass, freezer, 60)
    assert len([c for c in daily_devices if c.domain == "light"]) == 1
    hass.states.async_set("input_datetime.alarm", "18:02:00", {"has_time": True, "has_date": False})
    await hass.async_block_till_done()
    await advance(hass, freezer, 60)
    assert len([c for c in daily_devices if c.domain == "light"]) == 1


async def test_overnight_relative_step_dispatches_on_parent_source_date(
    hass, daily_entry, daily_devices, freezer, runtime_program
):
    runtime_program["steps"].pop("script")
    runtime_program["steps"]["on"]["timing"] = {"absolute_time": {"start": "23:59"}}
    runtime_program["steps"]["off"]["timing"] = {
        "relative_to": {"step": "on", "start_offset": "2m"}
    }
    for step in runtime_program["steps"].values():
        step["days"] = ["mon"]
    engine = await load(hass, daily_entry, freezer, "2026-10-12T23:58:00+00:00")
    await engine.async_replace_program(validate_program(runtime_program))
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert hass.states.get("light.proof").state == "on", engine.snapshot()
    await advance(hass, freezer, 120)
    assert hass.states.get("light.proof").state == "off"


async def test_stale_revision_does_not_replace_program(
    hass, daily_entry, daily_devices, freezer, runtime_program
):
    from custom_components.occupied.validation import RevisionConflict

    engine = await load(hass, daily_entry, freezer)
    revision = program_revision(engine.program)
    runtime_program["name"] = "Replacement"
    with pytest.raises(RevisionConflict):
        await engine.async_replace_program(
            validate_program(runtime_program), expected_revision="stale"
        )
    assert program_revision(engine.program) == revision
