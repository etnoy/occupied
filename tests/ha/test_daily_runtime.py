"""Daily steps through real HA timers, storage, services, and state listeners."""

import sys
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
async def test_cover_attribute_only_outside_changes_yield_until_next_scheduled_action(
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
    assert "cover.blind" not in engine._yielded
    assert [call.service for call in cover_devices] == [
        "set_cover_position",
        "set_cover_tilt_position",
    ]
    await advance(hass, freezer, 180)
    assert [call.service for call in cover_devices] == [
        "set_cover_position",
        "set_cover_tilt_position",
        "stop_cover",
    ]


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


@pytest.mark.parametrize("custom", [False, True])
@pytest.mark.parametrize("restart", [False, True])
async def test_next_scheduled_action_reclaims_manual_override(
    hass, daily_entry, daily_devices, freezer, custom, restart
):
    if custom:
        step = daily_entry.data["program"]["steps"]["off"]
        step["actions"] = [{"action": step.pop("action"), "entities": step.pop("entities")}]
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    attrs = dict(hass.states.get("light.proof").attributes)
    hass.states.async_set("light.proof", "off", attrs)
    await hass.async_block_till_done()
    hass.states.async_set("light.proof", "on", attrs)
    await hass.async_block_till_done()
    assert "light.proof" in engine._yielded
    if restart:
        from custom_components.occupied.engine_daily import DailyEngine

        await engine.async_close(cleanup=False)
        engine = DailyEngine(hass, daily_entry.entry_id, engine.program)
        await engine.async_prepare()
        await engine.async_start()
        assert "light.proof" in engine._yielded
    try:
        await advance(hass, freezer, 239)
        assert hass.states.get("light.proof").state == "on"
        assert "light.proof" in engine._yielded
        await advance(hass, freezer, 1)
        assert hass.states.get("light.proof").state == "off"
        assert "light.proof" not in engine._yielded
        assert [c.service for c in daily_devices if c.domain == "light"] == ["turn_on", "turn_off"]
        assert any(
            ":off:" in key and value["status"] == "dispatched"
            for key, value in engine._journal.items()
        )
    finally:
        if restart:
            await engine.async_close()


async def test_scheduled_action_only_reclaims_its_own_targets(
    hass, daily_entry, daily_devices, freezer
):
    daily_entry.data["program"]["steps"]["second"] = {
        "timing": {"absolute_time": {"start": "18:10"}},
        "action": "turn_off",
        "entities": ["light.second"],
    }
    hass.states.async_set("light.second", "off")
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    hass.states.async_set("light.proof", "off")
    hass.states.async_set("light.second", "on")
    await hass.async_block_till_done()
    assert {"light.proof", "light.second"} <= engine._yielded
    await advance(hass, freezer, 240)
    assert "light.proof" not in engine._yielded
    assert "light.second" in engine._yielded
    assert hass.states.get("light.second").state == "on"
    await advance(hass, freezer, 300)
    assert "light.second" not in engine._yielded
    assert hass.states.get("light.second").state == "off"


@pytest.mark.parametrize("custom", [False, True])
async def test_new_override_during_scheduled_dispatch_still_cancels_call(
    hass, daily_entry, daily_devices, freezer, monkeypatch, custom
):
    import asyncio

    if custom:
        step = daily_entry.data["program"]["steps"]["off"]
        step["actions"] = [{"action": step.pop("action"), "entities": step.pop("entities")}]
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    persist = engine._persist
    changed = False

    async def persist_with_override():
        nonlocal changed
        result = await persist()
        if not changed and any(
            ":off:" in key and value["status"] == "pending"
            for key, value in engine._journal.items()
        ):
            changed = True
            attrs = dict(hass.states.get("light.proof").attributes)
            hass.states.async_set("light.proof", "on", attrs | {"brightness": 77})
            await asyncio.sleep(0)
        return result

    monkeypatch.setattr(engine, "_persist", persist_with_override)
    await advance(hass, freezer, 240)
    assert changed and "light.proof" in engine._yielded
    assert hass.states.get("light.proof").state == "on"
    assert [call.service for call in daily_devices if call.domain == "light"] == ["turn_on"]
    assert any(
        ":off:" in key and value["status"] == "cancelled_before_dispatch"
        for key, value in engine._journal.items()
    )


@pytest.mark.parametrize("unresolved", [None, "unknown", "unavailable"])
@pytest.mark.parametrize("recover_before_action", [False, True])
async def test_availability_changes_do_not_yield_future_actions(
    hass, daily_entry, daily_devices, freezer, unresolved, recover_before_action
):
    from custom_components.occupied.const import EVENT_ACTION

    activity = []
    hass.bus.async_listen(EVENT_ACTION, activity.append)
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    attrs = dict(hass.states.get("light.proof").attributes)
    if unresolved is None:
        hass.states.async_remove("light.proof")
    else:
        hass.states.async_set("light.proof", unresolved)
    await hass.async_block_till_done()
    if not recover_before_action:
        await advance(hass, freezer, 60)
        assert not daily_devices and not activity
        assert any(value["status"] == "unavailable" for value in engine._journal.values())
    hass.states.async_set("light.proof", "off", attrs)
    await hass.async_block_till_done()
    assert "light.proof" not in engine._yielded
    if recover_before_action:
        await advance(hass, freezer, 60)
        assert hass.states.get("light.proof").state == "on"
    await advance(hass, freezer, 240)
    light_calls = [call for call in daily_devices if call.domain == "light"]
    assert [call.service for call in light_calls] == (
        ["turn_on", "turn_off"] if recover_before_action else ["turn_off"]
    )
    assert len(activity) == len(daily_devices)


async def test_availability_recovery_does_not_clear_real_manual_yield(
    hass, daily_entry, daily_devices, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    attrs = dict(hass.states.get("light.proof").attributes)
    hass.states.async_set("light.proof", "off", attrs)
    await hass.async_block_till_done()
    assert "light.proof" in engine._yielded
    hass.states.async_set("light.proof", "unavailable")
    await hass.async_block_till_done()
    hass.states.async_set("light.proof", "off", attrs)
    await hass.async_block_till_done()
    assert "light.proof" in engine._yielded
    await advance(hass, freezer, 240)
    assert "light.proof" not in engine._yielded
    assert [call.service for call in daily_devices if call.domain == "light"] == [
        "turn_on",
        "turn_off",
    ]


async def test_availability_loss_abandons_handover_without_holding_recovered_device(
    hass, daily_entry, daily_devices, freezer
):
    daily_entry.data["program"]["steps"]["off"]["timing"]["relative_to"]["start_offset"] = "30m"
    engine = await load(hass, daily_entry, freezer, "2026-10-13T18:03:00+00:00")
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 0)
    assert "light.proof" in engine._owned
    assert "light.proof" in engine._handover
    assert "light.proof" in engine._native_fades
    attrs = dict(hass.states.get("light.proof").attributes)
    before = len(daily_devices)
    hass.states.async_set("light.proof", "unavailable")
    await hass.async_block_till_done()
    hass.states.async_set("light.proof", "off", attrs)
    await hass.async_block_till_done()
    assert "light.proof" not in engine._owned
    assert "light.proof" not in engine._handover
    assert "light.proof" not in engine._native_fades
    assert "light.proof" not in engine._yielded
    await advance(hass, freezer, 600)
    await engine.async_set_enabled(False)
    assert len(daily_devices) == before


@pytest.mark.parametrize("unresolved", [None, "unknown", "unavailable"])
async def test_restart_with_unresolved_owned_light_does_not_yield_it(
    hass, daily_entry, daily_devices, freezer, unresolved
):
    from custom_components.occupied.engine_daily import DailyEngine

    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    attrs = dict(hass.states.get("light.proof").attributes)
    assert "light.proof" in engine._owned
    await engine.async_close(cleanup=False)
    if unresolved is None:
        hass.states.async_remove("light.proof")
    else:
        hass.states.async_set("light.proof", unresolved)
    await hass.async_block_till_done()
    restarted = DailyEngine(hass, daily_entry.entry_id, engine.program)
    try:
        await restarted.async_prepare()
        assert "light.proof" not in restarted._yielded
        assert "light.proof" not in restarted._owned
        await restarted.async_start()
        hass.states.async_set("light.proof", "on", attrs)
        await hass.async_block_till_done()
        await advance(hass, freezer, 240)
        assert [call.service for call in daily_devices if call.domain == "light"] == [
            "turn_on",
            "turn_off",
        ]
    finally:
        await restarted.async_close()


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
    assert {entity.unique_id for entity in switches} == {
        f"{daily_entry.entry_id}_enabled",
    }
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
    assert "light.proof" in restarted._yielded
    await advance(hass, freezer, 1140)
    assert len(daily_devices) == before + 1
    assert "light.proof" not in restarted._yielded
    assert daily_devices[-1].service == "turn_off"


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


@pytest.mark.skipif(
    sys.version_info < (3, 14, 4),
    reason="Recorder annotationlib/create_autospec harness bug before CPython 3.14.4",
)
async def test_device_activity_includes_successful_actions_and_survives_reload(
    recorder_mock, hass, daily_entry, daily_devices, freezer, runtime_program
):
    from homeassistant.components.logbook.helpers import (
        async_determine_event_types,
        event_forwarder_filtered,
    )
    from homeassistant.components.logbook.processor import EventProcessor
    from homeassistant.setup import async_setup_component
    from pytest_homeassistant_custom_component.components.recorder.common import (
        async_wait_recording_done,
    )

    from custom_components.occupied.compat import controller_device
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
    device = controller_device(hass, daily_entry.entry_id)
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


async def test_timing_limit_edits_and_obsolete_cache_do_not_replay_completed_steps(
    hass, daily_entry, daily_devices, freezer, runtime_program, hass_storage
):
    runtime_program["steps"] = {
        "script": {
            "timing": {
                "absolute_time": {"start": "18:05"},
                "latest_at": {"absolute_time": {"start": "18:01"}},
            },
            "action": "script.turn_on",
            "entities": ["script.test"],
        }
    }
    hass.config_entries.async_update_entry(
        daily_entry, data={**daily_entry.data, "program": runtime_program}
    )
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert len(daily_devices) == 1
    runtime_program["steps"]["script"]["timing"]["latest_at"]["absolute_time"]["start"] = "18:03"
    await engine.async_replace_program(validate_program(runtime_program))
    await advance(hass, freezer, 120)
    assert len(daily_devices) == 1
    await hass.config_entries.async_unload(daily_entry.entry_id)
    saved = hass_storage[f"occupied.{daily_entry.entry_id}.runtime"]["data"]
    # Emulate a pre-feature journal together with a now-obsolete plan cache.
    saved["journal"] = {
        key.replace("live:step:", f"live:{'a' * 64}:"): value
        for key, value in saved["journal"].items()
    }
    for cached in saved["plans"]:
        cached["planner_version"] = 10
    assert await hass.config_entries.async_setup(daily_entry.entry_id)
    await hass.async_block_till_done()
    restarted = daily_entry.runtime_data
    runtime_program["steps"]["script"]["timing"]["latest_at"]["absolute_time"]["start"] = "18:04"
    await restarted.async_replace_program(validate_program(runtime_program))
    await advance(hass, freezer, 60)
    assert len(daily_devices) == 1


@pytest.mark.parametrize("enforce", [False, True])
async def test_excluded_steps_have_no_dispatch_handover_or_startup_intent(
    hass, daily_entry, daily_devices, freezer, runtime_program, enforce
):
    for step in runtime_program["steps"].values():
        step["timing"]["only_before"] = {"absolute_time": {"start": "05:00"}}
    if enforce:
        runtime_program["run_condition"] = {
            "entity_id": "sensor.alarm",
            "state": "armed_away",
            "enforce_state_on_start": True,
            "start_delay": "0s",
        }
        hass.states.async_set("sensor.alarm", "armed_away")
    hass.config_entries.async_update_entry(
        daily_entry, data={**daily_entry.data, "program": runtime_program}
    )
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 600)
    assert not daily_devices and not engine._handover
    assert all(not plan.events for plan in engine._plans.values())


async def test_early_solar_cap_journal_survives_until_its_future_source_date(
    hass, daily_entry, daily_devices, freezer, runtime_program, monkeypatch
):
    def solar(observer, *, date, tzinfo):
        return dt_util.parse_datetime(f"{date}T18:01:00+00:00")

    monkeypatch.setattr("custom_components.occupied.time_utils.sunrise", solar)
    hass.config.latitude, hass.config.longitude = 59.3, 18.1
    runtime_program["steps"] = {
        "script": {
            "days": ["sat"],
            "timing": {
                "absolute_time": {"start": "18:05"},
                "latest_at": {"relative_to": {"sun": "sunrise", "start_offset": "-96h"}},
            },
            "action": "script.turn_on",
            "entities": ["script.test"],
        }
    }
    hass.config_entries.async_update_entry(
        daily_entry, data={**daily_entry.data, "program": runtime_program}
    )
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert len(daily_devices) == 1
    await advance(hass, freezer, 4 * 86400 - 60)
    runtime_program["steps"]["script"]["timing"]["latest_at"]["relative_to"]["start_offset"] = "0s"
    await engine.async_replace_program(validate_program(runtime_program))
    await advance(hass, freezer, 60)
    assert len(daily_devices) == 1


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
        "entity_id": "alarm_control_panel.alarm",
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
    hass.states.async_set("alarm_control_panel.alarm", "disarmed")
    return program


async def set_alarm(hass, state, context=None):
    entity = "alarm_control_panel.alarm"
    if state is None:
        hass.states.async_remove(entity, context=context)
    else:
        hass.states.async_set(entity, state, context=context)
    await hass.async_block_till_done()


async def press_enforce_now(hass, entry):
    from homeassistant.helpers import entity_registry as er

    registry = er.async_get(hass)
    entity_id = registry.async_get_entity_id(
        "button", "occupied", f"{entry.entry_id}_enforce_state_now"
    )
    assert entity_id
    await hass.services.async_call("button", "press", {"entity_id": entity_id}, blocking=True)
    await hass.async_block_till_done()
    return entity_id


@pytest.mark.parametrize("startup_enforcement", [False, True])
async def test_enforce_now_button_repairs_yielded_targets_immediately_and_preserves_schedule(
    hass, daily_entry, daily_devices, cover_devices, condition_program, freezer, startup_enforcement
):
    from homeassistant.helpers import entity_registry as er

    from custom_components.occupied.const import EVENT_ACTION

    condition_program["run_condition"]["enforce_state_on_start"] = startup_enforcement
    condition_program["steps"]["on"]["action"] = "light.turn_on"
    condition_program["steps"]["on"]["data"] = {"brightness_pct": 75}
    activity = []
    hass.bus.async_listen(EVENT_ACTION, activity.append)
    engine = await load(hass, daily_entry, freezer, "2026-10-13T18:03:00+00:00")
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    plans, session, seed = dict(engine._plans), engine.session, engine._seed
    source_revision = program_revision(engine.program)
    journal = dict(engine._journal)
    attrs = dict(hass.states.get("light.proof").attributes)
    hass.states.async_set("light.proof", "on", attrs)
    hass.states.async_set("light.proof", "off", attrs)
    hass.states.async_set("switch.proof", "on")
    hass.states.async_set("switch.proof", "off")
    hass.states.async_set(
        "cover.blind", "open", {"current_position": 30, "current_tilt_position": 5}
    )
    await hass.async_block_till_done()
    assert {"light.proof", "switch.proof", "cover.blind"} <= engine._yielded
    assert not daily_devices and not cover_devices

    entity_id = await press_enforce_now(hass, daily_entry)
    registry = er.async_get(hass)
    switch_id = registry.async_get_entity_id(
        "switch", "occupied", f"{daily_entry.entry_id}_enabled"
    )
    assert registry.async_get(entity_id).device_id == registry.async_get(switch_id).device_id
    assert hass.states.get(entity_id).attributes["friendly_name"].endswith("Enforce expected state")
    assert hass.states.get("light.proof").state == "on"
    assert hass.states.get("light.proof").attributes["brightness"] == round(75 * 255 / 100)
    assert hass.states.get("switch.proof").state == "on"
    assert [c.service for c in cover_devices] == ["set_cover_position", "set_cover_tilt_position"]
    assert len(daily_devices) == 2 and len(activity) == 4
    assert not any(c.domain in {"scene", "script"} for c in daily_devices)
    assert engine.reconciliation["phase"] == "complete" and not engine._yielded
    assert engine.activation_deadline is None and engine.active
    assert engine.enforce_state_on_start is startup_enforcement
    assert engine.program.run_condition.start_delay == 30
    assert (engine.session, engine._seed) == (session, seed)
    assert engine._plans == plans and program_revision(engine.program) == source_revision
    assert all(engine._journal[key] == value for key, value in journal.items())
    await advance(hass, freezer, 30)
    assert len(daily_devices) == 2 and len(cover_devices) == 2
    await advance(hass, freezer, 90)
    assert cover_devices[-1].service == "stop_cover"


async def test_enforce_now_can_fix_fresh_drift_repeatedly_in_one_activation(
    hass, daily_entry, daily_devices, condition_program, freezer
):
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 30)
    assert len(daily_devices) == 2
    session = engine.session
    for count in (3, 4):
        hass.states.async_set("light.proof", "off")
        await hass.async_block_till_done()
        assert "light.proof" in engine._yielded
        await press_enforce_now(hass, daily_entry)
        assert hass.states.get("light.proof").state == "on"
        assert len(daily_devices) == count
        assert engine.session == session
    await press_enforce_now(hass, daily_entry)
    assert len(daily_devices) == 4
    keys = [key for key in engine._journal if key.startswith("enforce:manual:")]
    assert len(keys) == 2 and len({key.split(":")[2] for key in keys}) == 2


async def test_enforce_now_without_condition_replaces_native_handover(
    hass, daily_entry, daily_devices, freezer
):
    daily_entry.data["program"]["steps"]["off"]["timing"] = {"absolute_time": {"start": "19:00"}}
    daily_entry.data["program"]["steps"]["on"]["action"] = "light.turn_on"
    daily_entry.data["program"]["steps"]["on"]["data"] = {"brightness_pct": 75}
    engine = await load(hass, daily_entry, freezer, "2026-10-13T18:03:00+00:00")
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 0)
    assert engine._native_fades and engine._handover
    await press_enforce_now(hass, daily_entry)
    assert not engine._handover and not engine._native_fades
    assert engine.reconciliation["phase"] == "complete" and engine.status == "active"
    assert not engine.enforce_state_on_start
    assert daily_devices[-1].data["transition"] == 0
    count = len(daily_devices)
    await advance(hass, freezer, 600)
    assert len(daily_devices) == count


@pytest.mark.parametrize("fail_first", [False, True])
async def test_enforce_now_dispatches_independent_targets_without_waiting_or_fading(
    hass, daily_entry, daily_devices, condition_program, freezer, hass_storage, fail_first
):
    import asyncio
    import threading

    from homeassistant.exceptions import HomeAssistantError

    from custom_components.occupied.const import EVENT_ACTION

    entities = ["light.proof", "light.second", "light.third"]
    condition_program["run_condition"]["enforce_state_on_start"] = False
    condition_program["steps"]["on"].update(
        entities=entities,
        action="light.turn_on",
        data={"brightness_pct": 75, "transition": 60},
        stagger={"enabled": True, "period": "2m"},
    )
    condition_program["steps"].pop("switch")
    attrs = dict(hass.states.get("light.proof").attributes)
    for entity in entities[1:]:
        hass.states.async_set(entity, "off", attrs)
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    all_started, release = threading.Event(), asyncio.Event()
    activity = []
    hass.bus.async_listen(EVENT_ACTION, activity.append)

    async def handle(call):
        daily_devices.append(call)
        assert engine.status == "active"
        journal = hass_storage[f"occupied.{daily_entry.entry_id}.runtime"]["data"]["journal"]
        assert any(
            key.startswith("enforce:manual:")
            and value["status"] == "pending"
            and value["intended"]["entities"] == call.data["entity_id"]
            for key, value in journal.items()
        )
        if len(daily_devices) == len(entities):
            all_started.set()
        await release.wait()
        for entity in call.data["entity_id"]:
            if fail_first and entity == "light.proof":
                raise HomeAssistantError("Device failed")
            hass.states.async_set(
                entity, "on", attrs | {"brightness": round(75 * 255 / 100)}, context=call.context
            )

    hass.services.async_register(
        "light",
        "turn_on",
        handle,
        schema=vol.Schema({vol.Required("entity_id"): cv.entity_ids}, extra=vol.ALLOW_EXTRA),
    )
    before = dt_util.utcnow()
    press = hass.async_create_task(engine.async_enforce_state_now())
    try:
        assert await hass.async_add_executor_job(all_started.wait, 2)
        assert not press.done() and not activity
        assert all(call.data["transition"] == 0 for call in daily_devices)
        assert all(
            value["status"] == "pending"
            for key, value in engine._journal.items()
            if key.startswith("enforce:manual:")
        )
    finally:
        release.set()
        await press
    assert dt_util.utcnow() == before
    assert len(activity) == len(entities) - fail_first
    assert not engine._handover and not engine._native_fades
    assert engine.reconciliation["phase"] == "complete"
    counts = engine._reconciliation_snapshot()["counts"]
    assert counts["applied"] == len(entities) - fail_first
    assert counts["failed"] == fail_first
    assert all(hass.states.get(entity).state == "on" for entity in entities[1:])
    assert hass.states.get("light.proof").state == ("off" if fail_first else "on")
    assert not any(event.kind == "retry" for event in engine._queue)


async def test_enforce_now_concurrent_writes_fail_closed_before_dispatch(
    controller_entity_id, hass, daily_entry, daily_devices, condition_program, freezer, monkeypatch
):
    from homeassistant.exceptions import HomeAssistantError

    condition_program["run_condition"]["enforce_state_on_start"] = False
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    save = engine._store.async_save

    async def fail_pending(data):
        if any(value["status"] == "pending" for value in data["journal"].values()):
            raise HomeAssistantError("Disk full")
        await save(data)

    monkeypatch.setattr(engine._store, "async_save", fail_pending)
    await engine.async_enforce_state_now()
    assert not daily_devices and not engine.active and not engine._queue
    assert engine._storage_failed and engine.status == "error"
    assert hass.states.get(controller_entity_id(daily_entry, "status")).state == "error"
    assert (
        "persistence failed"
        in hass.states.get(controller_entity_id(daily_entry, "status_reason")).state
    )
    assert engine.reconciliation["phase"] == "cancelled"


@pytest.mark.parametrize(
    "at",
    ["2026-10-15T23:06:54+00:00", "2026-03-29T23:06:54+00:00", "2026-10-26T00:06:54+00:00"],
)
async def test_enforce_now_after_midnight_uses_previous_local_day_targets(
    hass, daily_entry, daily_devices, cover_devices, freezer, at
):
    from custom_components.occupied.const import EVENT_ACTION
    from custom_components.occupied.diagnostics import diagnostics_data

    daily_entry.data["program"]["steps"] = {
        "sunset": {
            "timing": {"relative_to": {"sun": "dusk", "start_offset": "-30m"}},
            "actions": [
                {
                    "action": "set_state",
                    "entities": {
                        "light.proof": {"state": "on", "brightness": 24},
                        "light.late": {"state": "on", "brightness": 100},
                        "light.opaque": {"state": "on"},
                        "switch.proof": {"state": "on"},
                        "switch.late": {"state": "on"},
                    },
                    "stagger": {"enabled": True, "period": "2m"},
                },
                {
                    "action": "cover.set_cover_position",
                    "entities": ["cover.blind"],
                    "data": {"position": 60},
                },
                {"action": "script.turn_on", "entities": ["script.test"]},
                {"action": "script.turn_on", "entities": ["light.opaque"]},
            ],
        },
        "late_off": {
            "timing": {"absolute_time": {"start": "23:30", "end": "00:20"}},
            "action": "turn_off",
            "entities": ["light.late", "switch.late"],
            "stagger": {"enabled": True, "period": "2m"},
        },
        "morning": {
            "timing": {"absolute_time": {"start": "05:30"}},
            "action": "turn_off",
            "entities": ["light.proof", "switch.proof"],
        },
        "first_intent": {
            "timing": {"absolute_time": {"start": "05:30"}},
            "days": ["fri"],
            "action": "turn_on",
            "entities": ["light.no_intent"],
        },
    }
    for entity, state in (
        ("light.late", "on"),
        ("light.opaque", "off"),
        ("light.no_intent", "off"),
        ("switch.proof", "off"),
        ("switch.late", "on"),
    ):
        hass.states.async_set(entity, state, {"supported_color_modes": ["brightness"]})
    hass.config.latitude, hass.config.longitude = 59.3, 18.1
    engine = await load(hass, daily_entry, freezer, at)
    await hass.config.async_set_time_zone("Europe/Stockholm")
    await hass.async_block_till_done()

    async def switch(call):
        daily_devices.append(call)
        for entity in call.data["entity_id"]:
            hass.states.async_set(
                entity, "on" if call.service == "turn_on" else "off", context=call.context
            )

    for service in ("turn_on", "turn_off"):
        hass.services.async_register(
            "switch",
            service,
            switch,
            schema=vol.Schema({vol.Required("entity_id"): cv.entity_ids}, extra=vol.ALLOW_EXTRA),
        )
    activity = []
    hass.bus.async_listen(EVENT_ACTION, activity.append)
    await engine.async_set_enabled(True)
    assert not daily_devices and not cover_devices and not engine._yielded
    scheduled_journal = dict(engine._journal)
    plans, seed = dict(engine._plans), engine._seed
    await press_enforce_now(hass, daily_entry)

    assert hass.states.get("light.proof").state == "on"
    assert hass.states.get("light.proof").attributes["brightness"] == 24
    assert hass.states.get("switch.proof").state == "on"
    assert hass.states.get("light.late").state == "off"
    assert hass.states.get("switch.late").state == "off"
    assert [call.service for call in cover_devices] == ["set_cover_position"]
    assert len(daily_devices) == 4 and len(activity) == 5
    assert diagnostics_data(engine)["reconciliation"] == {
        "phase": "complete",
        "counts": {"checked": 8, "applied": 5, "already_matching": 0, "failed": 0, "skipped": 3},
    }
    assert not any(call.domain == "script" for call in daily_devices)
    for entity in ("light.opaque", "light.no_intent"):
        assert engine.reconciliation["results"][entity] == {
            "status": "skipped",
            "reason": "Expected state is unknown or opaque",
        }
    assert engine._plans == plans and engine._seed == seed
    assert all(engine._journal[key] == value for key, value in scheduled_journal.items())
    await press_enforce_now(hass, daily_entry)
    assert len(daily_devices) == 4 and len(cover_devices) == 1
    await advance(hass, freezer, 4 * 3600 + 23 * 60 + 6)
    assert hass.states.get("light.proof").state == "off"
    assert hass.states.get("switch.proof").state == "off"


@pytest.mark.parametrize(
    ("blocked", "reason"),
    [
        ("disabled", "Disabled by user"),
        ("paused", "Management is paused"),
        ("condition", "current state disarmed"),
        ("unavailable", "unresolved"),
        ("configuration", "Managed configuration unresolved"),
        ("storage", "persistence failed"),
        ("startup", "Waiting for Home Assistant startup"),
        ("closed", "Integration unloaded"),
    ],
)
async def test_enforce_now_rejects_ineligible_controller_without_reclaiming_entities(
    hass, daily_entry, daily_devices, condition_program, freezer, blocked, reason
):
    from homeassistant.exceptions import HomeAssistantError

    engine = await load(hass, daily_entry, freezer)
    if blocked != "disabled":
        await engine.async_set_enabled(True)
    if blocked != "condition":
        await set_alarm(hass, "unavailable" if blocked == "unavailable" else "armed_away")
    if blocked == "paused":
        await engine.async_set_paused(True)
    elif blocked == "configuration":
        engine.configuration_ready = False
    elif blocked == "storage":
        engine._storage_failed = True
    elif blocked == "startup":
        engine.started = False
    elif blocked == "closed":
        await engine.async_close()
    engine._yielded.add("light.proof")
    with pytest.raises(HomeAssistantError, match=reason):
        await engine.async_enforce_state_now()
    assert "light.proof" in engine._yielded and not daily_devices


@pytest.mark.parametrize("interruption", ["condition", "permission", "pause"])
@pytest.mark.parametrize("concurrency", [1, 2])
async def test_enforce_now_interruption_during_dispatch_cancels_remaining_calls(
    hass,
    daily_entry,
    daily_devices,
    condition_program,
    freezer,
    interruption,
    concurrency,
    monkeypatch,
):
    import asyncio

    monkeypatch.setattr(
        "custom_components.occupied.engine_daily.ENFORCEMENT_CONCURRENCY", concurrency
    )
    condition_program["steps"]["on"]["entities"].append("light.second")
    hass.states.async_set("light.second", "off", {"supported_color_modes": ["brightness"]})
    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    started, release = asyncio.Event(), asyncio.Event()

    async def handle(call):
        daily_devices.append(call)
        if len(daily_devices) == concurrency:
            started.set()
        await release.wait()

    hass.services.async_register("light", "turn_on", handle)
    press = hass.async_create_task(engine.async_enforce_state_now())
    await started.wait()
    if interruption == "condition":
        hass.states.async_set("alarm_control_panel.alarm", "disarmed")
        await asyncio.sleep(0)
        control = None
    else:
        control = hass.async_create_task(
            engine.async_set_enabled(False)
            if interruption == "permission"
            else engine.async_set_paused(True)
        )
        await asyncio.sleep(0)
    release.set()
    await press
    if control:
        await control
    await hass.async_block_till_done()
    assert len(daily_devices) == concurrency
    assert all(call.domain == "light" for call in daily_devices)
    assert not engine.active and not engine._queue
    assert engine.reconciliation["phase"] == "cancelled"


@pytest.mark.parametrize("target", ["unknown", "unavailable", "disabled", "opaque", "no_intent"])
async def test_enforce_now_skips_targets_that_cannot_supply_known_available_intent(
    hass, daily_entry, daily_devices, condition_program, freezer, target
):
    from homeassistant.helpers import entity_registry as er

    if target == "disabled":
        state = hass.states.get("light.proof")
        hass.states.async_remove("light.proof")
        registered = er.async_get(hass).async_get_or_create(
            "light",
            "test",
            "disabled-light",
            suggested_object_id="proof",
            disabled_by=er.RegistryEntryDisabler.USER,
        )
        assert registered.entity_id == "light.proof"
        hass.states.async_set("light.proof", state.state, state.attributes)
    if target == "opaque":
        condition_program["steps"]["opaque"] = {
            "timing": {"absolute_time": {"start": "17:30"}},
            "action": "script.turn_on",
            "entities": ["light.proof"],
        }
    elif target == "no_intent":
        condition_program["steps"]["on"]["timing"] = {"absolute_time": {"start": "19:00"}}
        for key in ("on", "off"):
            condition_program["steps"][key]["days"] = ["tue"]
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    hass.states.async_set("switch.proof", "on")
    if target in {"unknown", "unavailable"}:
        hass.states.async_set("light.proof", target)
    await press_enforce_now(hass, daily_entry)
    assert not daily_devices
    result = engine.reconciliation["results"]["light.proof"]
    assert result["status"] == ("entity_disabled" if target == "disabled" else "skipped")


async def test_enforce_now_respects_new_manual_changes_during_reconciliation(
    hass, daily_entry, daily_devices, condition_program, freezer, monkeypatch
):
    import asyncio

    # Keep the second target undispatched until the first handler reports manual control.
    # Bounded parallel reconciliation has its own concurrency tests.
    monkeypatch.setattr("custom_components.occupied.engine_daily.ENFORCEMENT_CONCURRENCY", 1)

    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")

    async def handle(call):
        daily_devices.append(call)
        hass.states.async_set("switch.proof", "on")
        hass.states.async_set("switch.proof", "off")
        await asyncio.sleep(0)

    hass.services.async_register("light", "turn_on", handle)
    await press_enforce_now(hass, daily_entry)
    assert len(daily_devices) == 1 and "switch.proof" in engine._yielded
    assert engine.reconciliation["results"]["switch.proof"]["reason"] == (
        "Manual control yielded entity"
    )


@pytest.mark.parametrize("failure", ["condition", "storage", "planning"])
async def test_enforce_now_rechecks_eligibility_after_planning_before_reclaiming(
    hass, daily_entry, daily_devices, condition_program, freezer, monkeypatch, failure
):
    import asyncio
    from unittest.mock import AsyncMock

    from homeassistant.exceptions import HomeAssistantError

    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    engine._yielded.add("light.proof")
    if failure == "condition":

        async def plan():
            hass.states.async_set("alarm_control_panel.alarm", "disarmed")
            await asyncio.sleep(0)

        monkeypatch.setattr(engine, "_ensure_plans", plan)
    elif failure == "storage":
        monkeypatch.setattr(
            engine._store, "async_save", AsyncMock(side_effect=HomeAssistantError("Disk full"))
        )
    else:
        monkeypatch.setattr(
            engine, "_ensure_plans", AsyncMock(side_effect=ValueError("Infeasible plan"))
        )
    with pytest.raises(HomeAssistantError, match="Cannot enforce expected states"):
        await engine.async_enforce_state_now()
    assert not daily_devices and "light.proof" in engine._yielded


@pytest.mark.parametrize("enforce", [False, True])
async def test_startup_enforcement_uses_settings_and_removes_retired_switch(
    hass, daily_entry, condition_program, freezer, hass_storage, enforce
):
    from homeassistant.helpers import entity_registry as er

    condition_program["run_condition"]["enforce_state_on_start"] = enforce
    key = f"occupied.{daily_entry.entry_id}.permission"
    hass_storage[key] = {
        "version": 1,
        "data": {"enabled": False, "paused": False, "enforce_state_on_start": not enforce},
    }
    registry = er.async_get(hass)
    retired = registry.async_get_or_create(
        "switch",
        "occupied",
        f"{daily_entry.entry_id}_enforce_state_on_start",
        config_entry=daily_entry,
    )
    engine = await load(hass, daily_entry, freezer)
    assert not registry.async_get(retired.entity_id)
    assert engine.enforce_state_on_start is enforce
    assert "enforce_state_on_start" not in hass_storage[key]["data"]
    assert engine.snapshot()["run_condition"]["enforce_state_on_start"] is enforce
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    await hass.async_block_till_done()
    assert daily_entry.runtime_data.enforce_state_on_start is enforce


async def test_enforcement_settings_restart_qualification_and_cancel_pending_enforcement(
    hass, daily_entry, daily_devices, condition_program, freezer
):
    from custom_components.occupied.validation import program_data

    engine = await load(hass, daily_entry, freezer)
    register_stagger_switch(hass, daily_devices)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    plans = dict(engine._plans)
    await advance(hass, freezer, 10)
    source = program_data(engine.program)
    source["run_condition"]["enforce_state_on_start"] = False
    await engine.async_replace_program(validate_program(source))
    assert engine.active and engine.activation_deadline is None
    assert engine.snapshot()["run_condition"]["enforce_state_on_start"] is False
    await advance(hass, freezer, 20)
    assert not daily_devices
    assert engine.program.run_condition.start_delay == 30
    source["run_condition"]["enforce_state_on_start"] = True
    await engine.async_replace_program(validate_program(source))
    assert engine.activation_deadline == dt_util.utcnow() + timedelta(seconds=30)
    deadline = engine.activation_deadline
    await advance(hass, freezer, 10)
    await engine.async_replace_program(validate_program(source))
    assert engine.activation_deadline == deadline
    await advance(hass, freezer, 20)
    assert len(daily_devices) == 2
    assert engine._plans == plans


async def test_unrelated_program_edits_preserve_enforcement_deadline(
    hass, daily_entry, condition_program, freezer
):
    from custom_components.occupied.validation import program_data

    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_enabled(True)
    await set_alarm(hass, "armed_away")
    deadline, session = engine.activation_deadline, engine.session
    source = program_data(engine.program)
    source["name"] = "Renamed controller"
    await engine.async_replace_program(validate_program(source))
    assert engine.enforce_state_on_start
    assert (engine.activation_deadline, engine.session) == (deadline, session)


async def test_run_condition_delay_enforces_all_known_targets(
    controller_entity_id,
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
    assert engine.status == "waiting"
    status = hass.states.get(controller_entity_id(daily_entry, "status"))
    assert status.state == "waiting"
    assert "run-condition" not in status.attributes["options"]
    assert status.attributes["reason"] == engine.reason
    assert "current state disarmed" in status.attributes["reason"]
    reason = hass.states.get(controller_entity_id(daily_entry, "status_reason"))
    assert reason.state == engine.reason
    assert reason.state.startswith("Waiting for run condition:")
    assert reason.attributes["friendly_name"] == f"{daily_entry.title} Status reason"
    assert "current state disarmed" in engine.reason
    await set_alarm(hass, "armed_away")
    deadline = engine.activation_deadline
    assert engine.status == "waiting" and engine.active
    assert (
        hass.states.get(controller_entity_id(daily_entry, "status_reason")).state == engine.reason
    )
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
    controller_entity_id,
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
    assert engine.status == "waiting"
    assert hass.states.get(controller_entity_id(daily_entry, "status_reason")).state.startswith(
        "Waiting for run condition:"
    )
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
            "alarm_control_panel.alarm",
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


async def test_run_condition_delay_crossing_midnight_preserves_known_targets(
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
    assert engine.active
    assert [call.domain for call in daily_devices] == ["switch"]
    assert hass.states.get("switch.proof").state == "on"
    assert engine.reconciliation["results"]["light.proof"]["status"] == "already_matching"
    assert engine.reconciliation["results"]["switch.proof"]["status"] == "dispatched"


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


async def test_planning_error_reports_reason_and_recovers(
    controller_entity_id, hass, daily_entry, freezer, monkeypatch
):
    from unittest.mock import AsyncMock

    engine = await load(hass, daily_entry, freezer)
    ensure_plans = engine._ensure_plans
    monkeypatch.setattr(
        engine, "_ensure_plans", AsyncMock(side_effect=ValueError("Infeasible plan"))
    )
    await engine.async_set_enabled(True)
    status = hass.states.get(controller_entity_id(daily_entry, "status"))
    assert status.state == "error" and not engine.active
    assert "inactive" not in status.attributes["options"]
    assert hass.states.get(controller_entity_id(daily_entry, "status_reason")).state == (
        "Cannot compile daily plan: Infeasible plan"
    )
    monkeypatch.setattr(engine, "_ensure_plans", ensure_plans)
    await engine.async_reevaluate()
    assert engine.active and engine.status in {"active", "transitioning"}


async def test_closed_daily_controller_entities_are_unavailable(
    controller_entity_id, hass, daily_entry, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await engine.async_close()
    await hass.async_block_till_done()
    for entity_id in (
        controller_entity_id(daily_entry, "status"),
        controller_entity_id(daily_entry, "status_reason"),
        controller_entity_id(daily_entry, "next_event"),
        controller_entity_id(daily_entry, "enabled", "switch"),
    ):
        assert hass.states.get(entity_id).state == "unavailable"


@pytest.mark.parametrize("startup_enforcement", [False, True])
async def test_extra_off_entities_follow_enforcement_delay_gate_and_manual_control(
    hass, daily_entry, daily_devices, condition_program, freezer, startup_enforcement
):
    from homeassistant.exceptions import HomeAssistantError

    condition_program["run_condition"].update(
        enforce_state_on_start=startup_enforcement,
        off_entities=["light.bathroom", "switch.fan", "light.proof", "light.missing"],
    )
    hass.states.async_set("light.bathroom", "on")
    hass.states.async_set("switch.fan", "on")
    engine = await load(hass, daily_entry, freezer)

    # Restore virtual switches after HA's switch platform installs its services.
    async def handle_switch(call):
        daily_devices.append(call)
        for entity in call.data["entity_id"]:
            hass.states.async_set(
                entity, "on" if call.service == "turn_on" else "off", context=call.context
            )

    for service in ("turn_on", "turn_off"):
        hass.services.async_register(
            "switch",
            service,
            handle_switch,
            schema=vol.Schema({vol.Required("entity_id"): cv.entity_ids}),
        )
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 30)
    assert hass.states.get("light.bathroom").state == "on"
    await set_alarm(hass, "armed_away")
    await advance(hass, freezer, 29)
    assert hass.states.get("light.bathroom").state == "on"
    await advance(hass, freezer, 1)
    if not startup_enforcement:
        assert hass.states.get("light.bathroom").state == "on"
        await press_enforce_now(hass, daily_entry)
    assert hass.states.get("light.bathroom").state == "off"
    assert hass.states.get("switch.fan").state == "off"
    assert hass.states.get("light.proof").state == "on"
    assert engine.reconciliation["results"]["light.missing"]["status"] == "skipped"
    hass.states.async_set("light.bathroom", "on")
    await hass.async_block_till_done()
    assert "light.bathroom" in engine._yielded
    await advance(hass, freezer, 60)
    assert hass.states.get("light.bathroom").state == "on"
    await press_enforce_now(hass, daily_entry)
    assert hass.states.get("light.bathroom").state == "off"
    await set_alarm(hass, "disarmed")
    hass.states.async_set("light.bathroom", "on")
    await hass.async_block_till_done()
    with pytest.raises(HomeAssistantError):
        await press_enforce_now(hass, daily_entry)
    assert hass.states.get("light.bathroom").state == "on"
