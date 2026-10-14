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


@pytest.fixture
def cover_devices(hass, daily_entry):
    calls = []
    hass.states.async_set(
        "cover.blind", "open", {"current_position": 20, "current_tilt_position": 10}
    )
    for key, clock, action, data in (
        ("cover_position", "18:01", "set_cover_position", {"position": 60}),
        ("cover_tilt", "18:02", "set_cover_tilt_position", {"tilt_position": 25}),
        ("cover_stop", "18:05", "stop_cover", {}),
    ):
        daily_entry.data["program"]["steps"][key] = {
            "timing": {"absolute_time": {"start": clock}},
            "action": f"cover.{action}",
            "entities": ["cover.blind"],
            "data": data,
        }

    async def handle(call):
        calls.append(call)
        for entity in call.data["entity_id"]:
            old = hass.states.get(entity)
            attrs = dict(old.attributes)
            for field in ("position", "tilt_position"):
                if field in call.data:
                    attrs[f"current_{field}"] = call.data[field]
            hass.states.async_set(entity, old.state, attrs, context=call.context)

    for service in ("set_cover_position", "set_cover_tilt_position", "stop_cover"):
        hass.services.async_register(
            "cover",
            service,
            handle,
            schema=vol.Schema({vol.Required("entity_id"): cv.entity_ids}, extra=vol.ALLOW_EXTRA),
        )
    return calls


async def test_cover_future_only_activation_never_reconciles_historical_targets(
    hass, daily_entry, daily_devices, cover_devices, freezer
):
    engine = await load(hass, daily_entry, freezer, "2026-10-13T18:03:00+00:00")
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 0)
    assert not cover_devices and "cover.blind" not in engine._handover
    assert hass.states.get("cover.blind").attributes["current_position"] == 20
    for source in ("cover_position", "cover_tilt"):
        assert any(
            source in key and value["status"] == "historical_skipped"
            for key, value in engine._journal.items()
        )
    await advance(hass, freezer, 120)
    assert [call.service for call in cover_devices] == ["stop_cover"]
    await engine.async_set_enabled(False)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 0)
    assert [call.service for call in cover_devices] == ["stop_cover"]


@pytest.mark.parametrize("attribute", ["current_position", "current_tilt_position"])
async def test_cover_attribute_only_outside_changes_yield_until_next_activation(
    hass, daily_entry, daily_devices, cover_devices, freezer, attribute
):
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert "cover.blind" not in engine._yielded
    observed = engine._observe("cover.blind")
    assert observed["attributes"] == {"current_position": 60, "current_tilt_position": 10}
    attrs = dict(hass.states.get("cover.blind").attributes)
    hass.states.async_set("cover.blind", "open", attrs | {"battery": 50})
    await hass.async_block_till_done()
    assert "cover.blind" not in engine._yielded
    hass.states.async_set("cover.blind", "open", attrs | {attribute: 40})
    await hass.async_block_till_done()
    assert "cover.blind" in engine._yielded
    await advance(hass, freezer, 60)
    assert [call.service for call in cover_devices] == ["set_cover_position"]
    await engine.async_set_enabled(False)
    await engine.async_set_enabled(True)
    assert "cover.blind" not in engine._yielded
    assert [call.service for call in cover_devices] == ["set_cover_position"]
    await advance(hass, freezer, 180)
    assert [call.service for call in cover_devices] == ["set_cover_position", "stop_cover"]


async def test_cover_calls_preserve_native_fields_and_controller_stop_adds_no_movement(
    hass, daily_entry, daily_devices, cover_devices, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    await advance(hass, freezer, 60)
    assert [dict(call.data) for call in cover_devices] == [
        {"entity_id": ["cover.blind"], "position": 60},
        {"entity_id": ["cover.blind"], "tilt_position": 25},
    ]
    assert "cover.blind" not in engine._yielded
    await engine.async_set_enabled(False)
    await advance(hass, freezer, 180)
    assert len(cover_devices) == 2


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


@pytest.mark.parametrize("dry_run", [False, True])
async def test_random_activity_dispatch_restart_and_manual_control(
    hass, daily_entry, daily_devices, freezer, runtime_program, dry_run
):
    runtime_program["steps"] = {}
    runtime_program["random"] = {
        "lamp": {
            "start": {"absolute_time": {"start": "18:01"}},
            "end": {"absolute_time": {"start": "18:21"}},
            "min_duration": "20m",
            "max_duration": "20m",
            "count": 1,
            "on": {"action": "turn_on", "entities": ["light.proof"]},
            "off": {"action": "turn_off", "entities": ["light.proof"]},
        }
    }
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_dry_run(dry_run)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert hass.states.get("light.proof").state == ("off" if dry_run else "on")
    plans = {day: plan.to_dict() for day, plan in engine._plans.items()}
    before = len(daily_devices)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    await hass.async_block_till_done()
    restarted = daily_entry.runtime_data
    assert {day: plan.to_dict() for day, plan in restarted._plans.items()} == plans
    await advance(hass, freezer, 0)
    assert len(daily_devices) == before
    await advance(hass, freezer, 1200)
    assert hass.states.get("light.proof").state == "off"
    assert [call.service for call in daily_devices] == ([] if dry_run else ["turn_on", "turn_off"])
    if not dry_run:
        await restarted.async_set_enabled(False)
        await advance(hass, freezer, 85200)
        await restarted.async_set_enabled(True)
        await advance(hass, freezer, 0)
        hass.states.async_set("light.proof", "off")
        await hass.async_block_till_done()
        assert "light.proof" in restarted._yielded
        before = len(daily_devices)
        await advance(hass, freezer, 60)
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


async def test_storage_failure_blocks_calls(
    hass, daily_entry, daily_devices, freezer, monkeypatch, caplog
):
    from homeassistant.exceptions import HomeAssistantError

    engine = await load(hass, daily_entry, freezer)

    async def fail(data):
        raise HomeAssistantError("Disk full")

    monkeypatch.setattr(engine._store, "async_save", fail)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 121)
    assert not daily_devices and not engine.active and engine._storage_failed
    assert "Disk full" in caplog.text
    assert daily_entry.entry_id in caplog.text


@pytest.mark.parametrize("state", [None, "unknown", "unavailable", "disabled"])
async def test_unresolved_or_disabled_target_logs_and_skips(
    hass, daily_entry, daily_devices, freezer, caplog, state
):
    from homeassistant.helpers import entity_registry as er

    from custom_components.occupied.planner import ResolvedAction

    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    entity = "switch.unresolved"
    if state == "disabled":
        entry = er.async_get(hass).async_get_or_create(
            "switch", "test", "disabled-target", disabled_by=er.RegistryEntryDisabler.USER
        )
        entity = entry.entity_id
        hass.states.async_set(entity, "off")
    elif state:
        hass.states.async_set(entity, state)
    caplog.clear()
    action = ResolvedAction("switch.turn_on", (entity,), {}, (entity,), True)
    assert not await engine._call(action, "test-target", engine.generation)
    assert not daily_devices
    assert entity in caplog.text
    assert "switch.turn_on" in caplog.text
    assert "test-target" in caplog.text
    assert daily_entry.entry_id in caplog.text
    assert ("disabled entities" if state == "disabled" else "unresolved entities") in caplog.text


@pytest.mark.parametrize("error", [ValueError("Unexpected failure"), TimeoutError()])
async def test_service_failure_logs_context(
    hass, daily_entry, daily_devices, freezer, caplog, error
):
    from custom_components.occupied.planner import ResolvedAction

    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)

    async def fail(call):
        raise error

    hass.services.async_register("script", "fail", fail)
    caplog.clear()
    action = ResolvedAction("script.fail", ("script.test",), {}, ("script.test",), False)
    assert not await engine._call(action, "test-failure", engine.generation)
    assert "script.fail" in caplog.text
    assert "script.test" in caplog.text
    assert "test-failure" in caplog.text
    assert type(error).__name__ in caplog.text
    assert daily_entry.entry_id in caplog.text


async def test_missing_service_logs_and_skips(hass, daily_entry, daily_devices, freezer, caplog):
    from custom_components.occupied.planner import ResolvedAction

    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    caplog.clear()
    action = ResolvedAction("light.missing", ("light.proof",), {}, ("light.proof",), False)
    assert not await engine._call(action, "test-missing-service", engine.generation)
    assert not daily_devices
    assert "light.missing" in caplog.text
    assert "light.proof" in caplog.text
    assert "service is not registered" in caplog.text


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


@pytest.mark.parametrize("fail", [False, True])
async def test_custom_block_order_and_stop_on_failure(
    hass, runtime_program, daily_entry, daily_devices, freezer, fail
):
    runtime_program["steps"] = {
        "custom": {
            "timing": {"absolute_time": {"start": "18:01"}},
            "actions": [
                {
                    "action": "set_state",
                    "entities": {"light.proof": {"state": "on", "brightness": 20}},
                },
                {"action": "script.turn_on", "entities": ["script.test"]},
                {"action": "light.turn_off", "entities": ["light.proof"]},
            ],
        },
    }
    # Entry construction copied the original program; deploy the changed candidate.
    hass.config_entries.async_update_entry(
        daily_entry, data={**daily_entry.data, "program": runtime_program}
    )
    attempted = []

    async def script(call):
        attempted.append(call)
        if fail:
            raise RuntimeError("custom failure")

    hass.services.async_register("script", "turn_on", script)
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert len(attempted) == 1
    assert [call.service for call in daily_devices] == (
        ["turn_on"] if fail else ["turn_on", "turn_off"]
    )
    assert daily_devices[0].data["brightness"] == 20
    statuses = {v["status"] for v in engine._journal.values()}
    assert ("blocked" in statuses) == fail
    assert ("failed" in statuses) == fail
    await advance(hass, freezer, 2)
    assert len(attempted) == 1  # Opaque custom blocks are never retried wholesale.
