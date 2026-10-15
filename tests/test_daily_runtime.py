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
def mock_recorder_before_hass(request):
    """Prepare recorder's database before the shared autouse HA fixture runs."""
    if "recorder_mock" in request.fixturenames:
        request.getfixturevalue("recorder_db_url")


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


@pytest.mark.parametrize("state", ["on", "off"])
async def test_activation_with_null_light_attributes(
    hass, daily_entry, daily_devices, freezer, state
):
    hass.states.async_set(
        "light.proof",
        state,
        {
            "brightness": None,
            "color_temp_kelvin": None,
            "hs_color": None,
            "rgb_color": None,
            "supported_color_modes": ["color_temp", "rgb"],
            "supported_features": LightEntityFeature.TRANSITION,
        },
    )
    engine = await load(hass, daily_entry, freezer, "2026-10-13T18:03:00+00:00")
    await engine.async_set_enabled(True)
    assert engine.active
    await advance(hass, freezer, 600)
    assert hass.states.get("light.proof").state == "off"
    assert any(call.service == "turn_off" for call in daily_devices)


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


@pytest.mark.parametrize("legacy_dry_run", [False, True])
async def test_retired_execution_mode_migrates_without_starting_simulated_controllers(
    hass, daily_entry, daily_devices, freezer, hass_storage, legacy_dry_run
):
    from homeassistant.helpers import entity_registry as er

    registry = er.async_get(hass)
    retired = registry.async_get_or_create(
        "switch",
        "occupied",
        f"{daily_entry.entry_id}_dry_run",
        config_entry=daily_entry,
    )
    permission_key = f"occupied.{daily_entry.entry_id}.permission"
    runtime_key = f"occupied.{daily_entry.entry_id}.runtime"
    hass_storage[permission_key] = {
        "version": 1,
        "data": {"enabled": True, "paused": False, "dry_run": legacy_dry_run},
    }
    hass_storage[runtime_key] = {
        "version": 1,
        "data": {
            "seed": "existing-seed",
            "dry_run": legacy_dry_run,
            "active": True,
            "virtual": {"light.proof": {"state": "on", "attributes": {}}},
            "owned": {"light.proof": {"state": "on", "attributes": {}}} if legacy_dry_run else {},
            "journal": {
                "dry:old": {"status": "historical_skipped"},
                "enforce:dry:old": {"status": "would_dispatch"},
                "handover:old": {"status": "would_dispatch"},
                "live:completed": {"status": "dispatched"},
            },
        },
    }

    engine = await load(hass, daily_entry, freezer)
    assert engine.enabled is not legacy_dry_run
    assert not daily_devices and not engine._owned and not engine._yielded
    assert engine._seed == "existing-seed"
    assert not registry.async_get(retired.entity_id)
    switches = [
        entity
        for entity in er.async_entries_for_config_entry(registry, daily_entry.entry_id)
        if entity.domain == "switch"
    ]
    assert [entity.unique_id for entity in switches] == [f"{daily_entry.entry_id}_enabled"]
    assert not hass.services.has_service("occupied", "set_dry_run")
    assert "dry_run" not in engine.snapshot()
    assert all("dry_run" not in state.attributes for state in hass.states.async_all("sensor"))
    assert engine._journal["live:completed"]["status"] == "dispatched"
    assert not any(key.startswith(("dry:", "enforce:dry:")) for key in engine._journal)
    assert not any(item["status"] == "would_dispatch" for item in engine._journal.values())
    assert hass_storage[permission_key]["data"] == {
        "enabled": not legacy_dry_run,
        "paused": False,
    }
    assert "dry_run" not in hass_storage[runtime_key]["data"]
    assert "virtual" not in hass_storage[runtime_key]["data"]

    if legacy_dry_run:
        await advance(hass, freezer, 30)
        assert not daily_devices
        await engine.async_set_enabled(True)
        await advance(hass, freezer, 30)
    else:
        await advance(hass, freezer, 60)
    assert [call.service for call in daily_devices] == ["turn_on"]
    assert hass.states.get("light.proof").state == "on"


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


async def test_random_activity_dispatch_restart_and_manual_control(
    hass, daily_entry, daily_devices, freezer, runtime_program
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
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert hass.states.get("light.proof").state == "on"
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
    assert [call.service for call in daily_devices] == ["turn_on", "turn_off"]
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


async def test_device_activity_includes_successful_actions_and_survives_reload(
    recorder_mock, hass, daily_entry, daily_devices, freezer, runtime_program
):
    from homeassistant.components.logbook.helpers import (
        async_determine_event_types,
        event_forwarder_filtered,
    )
    from homeassistant.components.logbook.processor import EventProcessor
    from homeassistant.helpers import device_registry as dr
    from homeassistant.setup import async_setup_component
    from pytest_homeassistant_custom_component.components.recorder.common import (
        async_wait_recording_done,
    )

    from custom_components.occupied.const import EVENT_ACTION

    assert await async_setup_component(hass, "logbook", {})
    runtime_program["steps"]["on"]["action"] = "light.turn_on"
    runtime_program["steps"]["on"]["data"] = {"brightness_pct": 42, "transition": 5}
    old = hass.states.get("light.proof")
    hass.states.async_set("light.proof", old.state, dict(old.attributes, friendly_name="Desk lamp"))
    events = []
    hass.bus.async_listen(EVENT_ACTION, events.append)
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert len(events) == 1
    event = events[0]
    assert event.data["message"] == (
        "Turned on Desk lamp (light.proof) at 42% brightness (transition: 5s)"
    )
    assert event.context.id == daily_devices[0].context.id
    device = dr.async_get(hass).async_get_device_by_identifier(
        ("occupied", daily_entry.entry_id), daily_entry.entry_id
    )
    assert event.data["device_id"] == device.id
    event_types = async_determine_event_types(hass, None, [device.id])
    assert EVENT_ACTION in event_types
    forwarded = []
    event_forwarder_filtered(forwarded.append, None, None, [device.id])(event)
    assert forwarded == [event]
    processor = EventProcessor(hass, event_types, device_ids=[device.id])
    await async_wait_recording_done(hass)
    history = await hass.async_add_executor_job(
        processor.get_events,
        dt_util.utcnow() - timedelta(minutes=1),
        dt_util.utcnow() + timedelta(seconds=1),
    )
    assert any(
        item.get("message") == event.data["message"]
        and item.get("entity_id") == "light.proof"
        and item.get("domain") == "occupied"
        for item in history
    ), history

    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    await hass.async_block_till_done()
    assert len(events) == 1
    await advance(hass, freezer, 60)
    assert events[-1].data["message"] == "Turned on script.test"
    assert len(events) == len(daily_devices)
    assert [event.context.id for event in events] == [call.context.id for call in daily_devices]
    before_failure = len(events)

    async def fail(_call):
        from homeassistant.exceptions import HomeAssistantError

        raise HomeAssistantError("Device unavailable")

    hass.services.async_register("light", "turn_off", fail)
    await advance(hass, freezer, 180)
    assert len(events) == before_failure


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


def register_stagger_switch(hass, calls):
    # HA's switch platform setup replaces the fixture's service; restore the virtual device.
    async def handle(call):
        calls.append(call)
        for entity in call.data["entity_id"]:
            hass.states.async_set(entity, "on", context=call.context)

    hass.services.async_register(
        "switch",
        "turn_on",
        handle,
        schema=vol.Schema({vol.Required("entity_id"): cv.entity_ids}, extra=vol.ALLOW_EXTRA),
    )


@pytest.mark.parametrize("custom", [False, True])
async def test_stagger_timer_dispatches_one_target_and_interleaves_other_work(
    hass, daily_entry, daily_devices, freezer, custom
):
    targets = ["light.proof", "light.second", "light.third", "switch.window"]
    for entity in targets[1:]:
        hass.states.async_set(entity, "off", {"supported_color_modes": ["brightness"]})
    action = {"action": "turn_on", "entities": targets, "stagger": {"enabled": True}}
    step = daily_entry.data["program"]["steps"]["on"]
    if custom:
        step.pop("action")
        step.pop("entities")
        step["actions"] = [action, {"action": "scene.turn_on", "entities": ["scene.evening"]}]
        hass.states.async_set("scene.evening", "off")
    else:
        step.update(action)
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 89)
    assert not daily_devices
    await advance(hass, freezer, 1)
    assert len(daily_devices) == 1
    assert len(daily_devices[0].data["entity_id"]) == 1
    first_target = daily_devices[0].data["entity_id"][0]
    await advance(hass, freezer, 30)
    assert len([c for c in daily_devices if c.domain in {"light", "switch"}]) == 2
    assert len([c for c in daily_devices if c.domain == "script"]) == 1
    await advance(hass, freezer, 30)
    assert len([c for c in daily_devices if c.domain in {"light", "switch"}]) == 3
    await advance(hass, freezer, 30)
    activations = [c for c in daily_devices if c.domain in {"light", "switch"}]
    assert len(activations) == 4
    assert {c.data["entity_id"][0] for c in activations} == set(targets)
    assert len([c for c in daily_devices if c.domain == "scene"]) == int(custom)
    assert daily_devices[0].data["entity_id"][0] == first_target
    await advance(hass, freezer, 30)
    assert len([c for c in daily_devices if c.domain in {"light", "switch"}]) == 4


async def test_stopping_stagger_cancels_remaining_ticks(hass, daily_entry, daily_devices, freezer):
    hass.states.async_set("switch.window", "off")
    daily_entry.data["program"]["steps"]["on"].update(
        entities=["light.proof", "switch.window"], stagger={"enabled": True}
    )
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 120)
    assert len([c for c in daily_devices if c.domain != "script"]) == 1
    await engine.async_set_enabled(False)
    await advance(hass, freezer, 120)
    assert len([c for c in daily_devices if c.domain != "script"]) == 1


async def test_custom_stagger_failure_blocks_future_ticks_and_following_actions(
    hass, daily_entry, daily_devices, freezer
):
    from homeassistant.exceptions import HomeAssistantError

    for entity in ("light.second", "scene.evening"):
        hass.states.async_set(entity, "off", {"supported_color_modes": ["brightness"]})
    daily_entry.data["program"]["steps"]["on"] = {
        "timing": {"absolute_time": {"start": "18:01"}},
        "actions": [
            {
                "action": "turn_on",
                "entities": ["light.proof", "light.second"],
                "stagger": {"enabled": True},
            },
            {"action": "scene.turn_on", "entities": ["scene.evening"]},
        ],
    }
    failed = []

    async def fail(call):
        failed.append(call)
        raise HomeAssistantError("Device failure")

    hass.services.async_register("light", "turn_on", fail)
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 120)
    assert len(failed) == 1
    await advance(hass, freezer, 60)
    assert len(failed) == 1
    assert not any(c.domain == "scene" for c in daily_devices)
    assert sum(e["status"] == "blocked" for e in engine._journal.values()) >= 2


async def test_custom_stagger_waits_for_an_earlier_deferred_action(
    hass, daily_entry, daily_devices, freezer
):
    for entity in ("light.second", "scene.evening"):
        hass.states.async_set(entity, "off", {"supported_color_modes": ["brightness"]})
    daily_entry.data["program"]["steps"]["on"] = {
        "timing": {"absolute_time": {"start": "18:01"}},
        "actions": [
            {"action": "light.toggle", "entities": ["light.proof"]},
            {
                "action": "turn_on",
                "entities": ["light.proof", "light.second"],
                "stagger": {"enabled": True},
            },
            {"action": "scene.turn_on", "entities": ["scene.evening"]},
        ],
    }
    daily_entry.data["program"]["steps"].pop("script")
    engine = await load(hass, daily_entry, freezer)

    async def toggle(call):
        daily_devices.append(call)

    hass.services.async_register("light", "toggle", toggle)
    await engine.async_set_enabled(True)
    engine._handover["light.proof"] = {"deadline": "2026-10-13T18:04:00+00:00"}
    await advance(hass, freezer, 180)
    assert not daily_devices
    engine._handover.clear()
    await advance(hass, freezer, 61)
    assert daily_devices[0].service == "toggle"
    # A continuation deferred behind its predecessor remains queued, not spun at the same time.
    await advance(hass, freezer, 1)
    assert [c.service for c in daily_devices] == ["toggle", "turn_on", "turn_on", "turn_on"]
    assert daily_devices[-1].domain == "scene"


@pytest.mark.parametrize("custom", [False, True])
async def test_staggered_off_dispatches_one_entity_per_tick(
    hass, daily_entry, daily_devices, freezer, custom
):
    hass.states.async_set("light.second", "off", {"supported_color_modes": ["brightness"]})
    daily_entry.data["program"]["steps"]["on"]["entities"] = ["light.proof", "light.second"]
    off = daily_entry.data["program"]["steps"]["off"]
    action = {
        "action": "turn_off",
        "entities": ["light.proof", "light.second"],
        "stagger": {"enabled": True},
    }
    if custom:
        off.pop("action")
        off.pop("entities")
        off["actions"] = [action]
    else:
        off.update(action)
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert len(daily_devices) == 2
    await advance(hass, freezer, 299)
    assert not any(c.service == "turn_off" for c in daily_devices)
    await advance(hass, freezer, 1)
    assert sum(c.service == "turn_off" for c in daily_devices) == 1
    await advance(hass, freezer, 60)
    assert sum(c.service == "turn_off" for c in daily_devices) == 2


@pytest.fixture
def condition_program(daily_entry, hass):
    program = daily_entry.data["program"]
    program["run_condition"] = {
        "entity_id": "alarm_control_panel.8124_aaa_zone_1_alarm",
        "state": ["armed_away", "armed_night"],
        "enforce_state_on_start": True,
    }
    program["steps"]["on"]["timing"] = {"absolute_time": {"start": "17:00"}}
    program["steps"]["off"]["timing"] = {"absolute_time": {"start": "23:00"}}
    program["steps"]["switch"] = {
        "timing": {"absolute_time": {"start": "17:00"}},
        "action": "turn_on",
        "entities": ["switch.proof"],
    }
    hass.states.async_set("switch.proof", "off")
    hass.states.async_set("alarm_control_panel.8124_aaa_zone_1_alarm", "disarmed")
    return program


async def set_alarm(hass, state, context=None):
    entity = "alarm_control_panel.8124_aaa_zone_1_alarm"
    if state is None:
        hass.states.async_remove(entity, context=context)
    else:
        hass.states.async_set(entity, state, context=context)
    await hass.async_block_till_done()


async def test_run_condition_delay_enforces_all_known_targets(
    hass,
    daily_entry,
    daily_devices,
    cover_devices,
    condition_program,
    freezer,
):
    engine = await load(hass, daily_entry, freezer, "2026-10-13T18:03:00+00:00")
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    assert not engine.active and not daily_devices and not cover_devices
    assert "current state disarmed" in engine.reason
    await set_alarm(hass, "armed_away")
    deadline = engine.activation_deadline
    assert engine.status == "waiting" and engine.active
    await advance(hass, freezer, 29)
    assert not daily_devices and not cover_devices
    await set_alarm(hass, "armed_night")
    assert engine.activation_deadline == deadline
    await advance(hass, freezer, 1)
    assert {(c.domain, c.service) for c in daily_devices} == {
        ("light", "turn_on"),
        ("switch", "turn_on"),
    }
    assert [c.service for c in cover_devices] == ["set_cover_position", "set_cover_tilt_position"]
    assert engine.reconciliation["phase"] == "complete"
    assert engine.activation_deadline is None and not engine._handover
    assert engine.snapshot()["run_condition"]["matches"]
    assert engine._observe("cover.blind")["attributes"]["current_position"] == 60


@pytest.mark.parametrize("ended_state", ["disarmed", "unknown", "unavailable", None])
async def test_run_condition_cancels_delay_and_stops_without_any_entity_commands(
    hass,
    daily_entry,
    daily_devices,
    condition_program,
    freezer,
    ended_state,
):
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 20)
    # Explicitly exercise the old cleanup path that would hold a native fade.
    engine._native_fades.add("light.proof")
    engine._owned["light.proof"] = engine._observe("light.proof")
    await set_alarm(hass, ended_state)
    await advance(hass, freezer, 60)
    assert not engine.active and engine.enabled and not engine._queue
    assert not daily_devices and not engine._owned and not engine._native_fades
    assert engine.reconciliation["phase"] == "cancelled"
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 29)
    assert not daily_devices
    await advance(hass, freezer, 1)
    count = len(daily_devices)
    assert count == 2
    await set_alarm(hass, "disarmed")
    await advance(hass, freezer, 3600)
    assert len(daily_devices) == count


async def test_run_condition_uses_deadline_projection_and_skips_opaque_events(
    hass,
    daily_entry,
    daily_devices,
    condition_program,
    freezer,
):
    condition_program["steps"]["off"]["timing"] = {"absolute_time": {"start": "18:00:20"}}
    condition_program["steps"]["script"]["timing"] = {"absolute_time": {"start": "18:00:10"}}
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 20)
    assert not daily_devices
    await advance(hass, freezer, 10)
    assert [(c.domain, c.service) for c in daily_devices] == [("switch", "turn_on")]
    assert engine.reconciliation["results"]["light.proof"]["status"] == "already_matching"
    assert engine.reconciliation["results"]["script.test"]["status"] == "skipped"
    assert any(
        "script" in key and value["status"] == "historical_skipped"
        for key, value in engine._journal.items()
    )


async def test_run_condition_disabled_enforcement_is_future_only(
    hass,
    daily_entry,
    daily_devices,
    condition_program,
    freezer,
):
    condition_program["run_condition"]["enforce_state_on_start"] = False
    condition_program["steps"]["off"]["timing"] = {"absolute_time": {"start": "18:01"}}
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 0)
    assert engine.active and not engine._handover and engine.activation_deadline is None
    assert not daily_devices
    await advance(hass, freezer, 60)
    assert [c.service for c in daily_devices] == ["turn_off"]


async def test_run_condition_manual_changes_yield_during_delay(
    hass,
    daily_entry,
    daily_devices,
    condition_program,
    freezer,
):
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    hass.states.async_set("switch.proof", "on")
    await hass.async_block_till_done()
    hass.states.async_set("switch.proof", "off")
    await hass.async_block_till_done()
    await advance(hass, freezer, 30)
    assert [c.domain for c in daily_devices] == ["light"]
    assert (
        engine.reconciliation["results"]["switch.proof"]["reason"]
        == "Manual control yielded entity"
    )


async def test_run_condition_reconciles_covers_and_switches(
    hass,
    daily_entry,
    daily_devices,
    cover_devices,
    condition_program,
    freezer,
):
    engine = await load(hass, daily_entry, freezer, "2026-10-13T18:03:00+00:00")
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 30)
    assert any(call.domain == "switch" for call in daily_devices)
    assert [call.service for call in cover_devices] == [
        "set_cover_position",
        "set_cover_tilt_position",
    ]
    assert hass.states.get("switch.proof").state == "on"
    assert hass.states.get("cover.blind").attributes["current_position"] == 60
    assert hass.states.get("cover.blind").attributes["current_tilt_position"] == 25


async def test_run_condition_restart_waits_fresh_delay_without_resampling(
    hass,
    daily_entry,
    daily_devices,
    condition_program,
    freezer,
):
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 20)
    plans = {day: plan.to_dict() for day, plan in engine._plans.items()}
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    await hass.async_block_till_done()
    restarted = daily_entry.runtime_data
    assert {day: plan.to_dict() for day, plan in restarted._plans.items()} == plans
    await advance(hass, freezer, 10)
    assert not daily_devices
    await advance(hass, freezer, 20)
    assert len(daily_devices) == 2


async def test_run_condition_policy_edits_preserve_plans_and_metadata_preserves_deadline(
    hass,
    daily_entry,
    daily_devices,
    condition_program,
    freezer,
):
    from custom_components.occupied.validation import program_data

    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    plans = dict(engine._plans)
    source = program_data(engine.program)
    source["name"] = "Changed name"
    deadline, session = engine.activation_deadline, engine.session
    await engine.async_replace_program(validate_program(source))
    assert (engine.activation_deadline, engine.session) == (deadline, session)
    await advance(hass, freezer, 5)
    source["run_condition"]["start_delay"] = "40s"
    await engine.async_replace_program(validate_program(source))
    assert engine.activation_deadline == dt_util.utcnow() + timedelta(seconds=40)
    assert engine._plans == plans
    await advance(hass, freezer, 39)
    assert not daily_devices
    await advance(hass, freezer, 1)
    assert len(daily_devices) == 2


async def test_run_condition_loss_during_dispatch_prevents_remaining_calls(
    hass,
    daily_entry,
    daily_devices,
    condition_program,
    freezer,
):
    from homeassistant.core import Context

    condition_program["run_condition"]["start_delay"] = "0s"
    calls = []

    async def handle(call):
        calls.append(call)
        # Own-context condition changes must still close the gate synchronously.
        hass.states.async_set(
            "alarm_control_panel.8124_aaa_zone_1_alarm",
            "disarmed",
            context=Context(parent_id=call.context.id),
        )

    hass.services.async_register("light", "turn_on", handle)
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 0)
    assert len(calls) == 1 and not daily_devices
    assert not engine.active and not engine._owned and not engine._queue


async def test_run_condition_enforces_known_light_settings_without_legacy_fade(
    hass,
    daily_entry,
    daily_devices,
    condition_program,
    freezer,
):
    condition_program["steps"]["on"].update(
        action="light.turn_on",
        data={"brightness": 32, "color_temp_kelvin": 3000},
    )
    attrs = dict(hass.states.get("light.proof").attributes)
    attrs["supported_color_modes"] = ["color_temp"]
    hass.states.async_set("light.proof", "off", attrs)
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 30)
    call = next(c for c in daily_devices if c.domain == "light")
    assert call.data["brightness_pct"] == pytest.approx(32 * 100 / 255)
    assert call.data["color_temp_kelvin"] == 3000
    assert "transition" not in call.data and not engine._handover
    count, session = len(daily_devices), engine.session
    await set_alarm(hass, "armed_night")
    await advance(hass, freezer, 60)
    assert len(daily_devices) == count and engine.session == session


async def test_run_condition_stopped_cover_axis_and_opaque_switch_are_not_replayed(
    hass,
    daily_entry,
    daily_devices,
    cover_devices,
    condition_program,
    freezer,
):
    condition_program["steps"]["opaque_switch"] = {
        "timing": {"absolute_time": {"start": "18:00"}},
        "action": "switch.toggle",
        "entities": ["switch.proof"],
    }
    engine = await load(hass, daily_entry, freezer, "2026-10-13T18:06:00+00:00")
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 30)
    assert [c.service for c in cover_devices] == ["set_cover_tilt_position"]
    assert [c.domain for c in daily_devices] == ["light"]
    assert engine.reconciliation["results"]["switch.proof"]["status"] == "skipped"


async def test_run_condition_delay_crossing_midnight_does_not_invent_baseline(
    hass,
    daily_entry,
    daily_devices,
    condition_program,
    freezer,
):
    engine = await load(hass, daily_entry, freezer, "2026-10-13T23:59:45+00:00")
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 30)
    assert not daily_devices and engine.active
    assert all(value["status"] == "skipped" for value in engine.reconciliation["results"].values())


async def test_run_condition_restart_after_shutdown_during_delay_still_qualifies(
    hass,
    daily_entry,
    daily_devices,
    condition_program,
    freezer,
):
    from custom_components.occupied.engine_daily import DailyEngine

    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 20)
    await engine.async_close(cleanup=False)
    restarted = DailyEngine(hass, daily_entry.entry_id, engine.program)
    await restarted.async_prepare()
    await restarted.async_start()
    try:
        assert restarted.activation_deadline == dt_util.utcnow() + timedelta(seconds=30)
        await advance(hass, freezer, 10)
        assert not daily_devices
    finally:
        await restarted.async_close()


async def test_run_condition_cover_becoming_unavailable_does_not_block_other_entities(
    hass,
    daily_entry,
    daily_devices,
    cover_devices,
    condition_program,
    freezer,
):
    async def unavailable_after_position(call):
        cover_devices.append(call)
        hass.states.async_set("cover.blind", "unavailable", context=call.context)

    hass.services.async_register("cover", "set_cover_position", unavailable_after_position)
    engine = await load(hass, daily_entry, freezer, "2026-10-13T18:03:00+00:00")
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 30)
    assert [call.service for call in cover_devices] == ["set_cover_position"]
    assert len(daily_devices) == 2 and engine.reconciliation["phase"] == "complete"
    assert engine.reconciliation["results"]["cover.blind"]["calls"] == ["dispatched", "unavailable"]
