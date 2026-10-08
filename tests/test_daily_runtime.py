"""Daily-runtime acceptance through real HA state, storage, timers and services."""

import asyncio
from copy import deepcopy
from datetime import timedelta

import pytest
import voluptuous as vol
from homeassistant.core import Context, CoreState
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from homeassistant.util.file import WriteError
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

from custom_components.occupied.actions import observe
from custom_components.occupied.diagnostics import diagnostics_data
from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.file_config import export_yaml
from custom_components.occupied.storage import plan_from_data
from custom_components.occupied.validation import ProgramError, program_data, validate_program


@pytest.fixture(autouse=True)
def runtime_clock(freezer):
    """Issue real API tokens in the same time frame as the simulated runtime."""
    freezer.move_to("2026-10-06T18:00:00+00:00")


@pytest.fixture
def runtime_program():
    return {
        "schema_version": 1,
        "name": "Daily house",
        "timezone": "UTC",
        "activation": {
            "conditions": [
                {
                    "condition": "state",
                    "entity_id": "sensor.alarm",
                    "state": ["armed", "armed_away"],
                }
            ]
        },
        "lighting": {
            "managed_targets": {"entities": ["light.proof"]},
            "baseline": [{"targets": {"entities": ["light.proof"]}, "state": "off"}],
        },
        "routines": [
            {
                "id": "daily",
                "name": "Daily",
                "steps": [
                    {
                        "id": "before",
                        "name": "Before activation",
                        "when": {"clock_range": {"earliest": "17:00", "latest": "17:00"}},
                        "actions": [
                            {
                                "action": "turn_on",
                                "targets": {"entities": ["light.proof"]},
                                "data": {"brightness_pct": 50},
                            }
                        ],
                    },
                    {
                        "id": "later",
                        "name": "Later",
                        "when": {"clock_range": {"earliest": "18:12", "latest": "18:12"}},
                        "actions": [
                            {"action": "turn_off", "targets": {"entities": ["light.proof"]}}
                        ],
                    },
                ],
                "activities": [
                    {
                        "id": "tv",
                        "name": "TV",
                        "when": {"clock_range": {"earliest": "18:11", "latest": "18:11"}},
                        "duration": {"fixed": "45m"},
                        "resources": ["remote.harmony"],
                        "on_start": [
                            {
                                "action": "remote.turn_on",
                                "targets": {"entities": ["remote.harmony"]},
                                "data": {"activity": "Watch TV"},
                            }
                        ],
                        "on_end": [
                            {
                                "action": "remote.turn_off",
                                "targets": {"entities": ["remote.harmony"]},
                            }
                        ],
                        "ownership_conditions": [
                            {
                                "condition": "state",
                                "entity_id": "remote.harmony",
                                "attribute": "current_activity",
                                "state": "Watch TV",
                            }
                        ],
                    }
                ],
            }
        ],
    }


@pytest.fixture
def daily_entry(hass, runtime_program):
    entry = MockConfigEntry(
        domain="occupied",
        unique_id="occupied",
        title="Daily house",
        data={"name": "Daily house", "program": runtime_program},
    )
    entry.add_to_hass(hass)
    return entry


@pytest.fixture
def daily_permission(hass_storage, daily_entry):
    hass_storage[f"occupied.{daily_entry.entry_id}.permission"] = {
        "version": 1,
        "data": {"enabled": True, "paused": False, "dry_run": False},
    }


@pytest.fixture
def daily_devices(hass):
    hass.states.async_set("sensor.alarm", "armed")
    hass.states.async_set(
        "light.proof", "on", {"brightness": 20, "supported_color_modes": ["brightness"]}
    )
    hass.states.async_set("remote.harmony", "off", {"current_activity": "PowerOff"})
    calls = []

    async def handle(call):
        calls.append(call)
        for entity in cv.ensure_list(call.data["entity_id"]):
            before = hass.states.get(entity)
            attrs = dict(before.attributes)
            attrs.update(
                {
                    key: value
                    for key, value in call.data.items()
                    if key in {"brightness", "color_temp_kelvin", "hs_color", "rgb_color"}
                }
            )
            if "brightness_pct" in call.data:
                attrs["brightness"] = round(call.data["brightness_pct"] * 255 / 100)
            if call.domain == "remote":
                attrs["current_activity"] = call.data.get("activity", "PowerOff")
            hass.states.async_set(
                entity, "on" if call.service == "turn_on" else "off", attrs, context=call.context
            )

    for domain in ("light", "switch", "remote"):
        for service in ("turn_on", "turn_off"):
            schema = vol.Schema({vol.Required("entity_id"): cv.entity_ids}, extra=vol.ALLOW_EXTRA)
            hass.services.async_register(domain, service, handle, schema=schema)
    return calls


async def load(hass, entry, freezer, *, at="2026-10-06T18:00:00+00:00", running=True):
    freezer.move_to(at)
    hass.set_state(CoreState.running if running else CoreState.not_running)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry.runtime_data


async def advance(hass, freezer, seconds):
    freezer.move_to(dt_util.utcnow() + timedelta(seconds=seconds))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


async def test_daily_handover_starts_observed_and_skips_historical_discrete_calls(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    assert isinstance(engine, DailyEngine)
    assert engine.status == "transitioning" and not daily_devices
    deadline = engine.handover_deadline
    plan = engine._plan_at(dt_util.utcnow())
    assert plan_from_data(plan.to_dict()) == plan
    await advance(hass, freezer, 300)
    assert daily_devices[-1].data["brightness"] == 74
    assert not any(call.domain == "remote" for call in daily_devices)
    assert all(call.data["brightness"] < 128 for call in daily_devices)
    generation, session = engine.generation, engine.session
    hass.states.async_set("sensor.alarm", "armed_away")
    await hass.async_block_till_done()
    assert engine.generation == generation and engine.session == session
    assert engine.handover_deadline == deadline
    await advance(hass, freezer, 300)
    assert daily_devices[-1].data["brightness"] == 128
    assert engine.status == "active"
    assert any(v["status"] == "historical_skipped" for v in engine._journal.values())


async def test_restart_keeps_plan_and_original_tv_deadline(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    lifecycle = next(iter(engine._activities.values()))
    deadline, plans = lifecycle.deadline, [p.to_dict() for p in engine._plans.values()]
    assert deadline == dt_util.utcnow() + timedelta(minutes=45)
    await advance(hass, freezer, 60)
    await engine.async_close(cleanup=False)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    restored = daily_entry.runtime_data
    assert restored.active and restored.session == engine.session
    assert [p.to_dict() for p in restored._plans.values()] == plans
    assert next(iter(restored._activities.values())).deadline == deadline
    assert sum(call.domain == "remote" and call.service == "turn_on" for call in daily_devices) == 1
    await advance(hass, freezer, 44 * 60 - 1)
    assert not any(call.domain == "remote" and call.service == "turn_off" for call in daily_devices)
    await advance(hass, freezer, 1)
    assert daily_devices[-1].domain == "remote" and daily_devices[-1].service == "turn_off"


async def test_overdue_tv_cleanup_after_outage_does_not_replay_start(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    await engine.async_close(cleanup=False)
    await advance(hass, freezer, 3600)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    assert not daily_entry.runtime_data._activities
    remote = [call.service for call in daily_devices if call.domain == "remote"]
    assert remote == ["turn_on", "turn_off"]


async def test_manual_remote_override_survives_restart_and_suppresses_end(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    hass.states.async_set(
        "remote.harmony", "on", {"current_activity": "Play Game"}, context=Context()
    )
    await hass.async_block_till_done()
    assert not engine._activities
    await engine.async_close(cleanup=False)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    await advance(hass, freezer, 3600)
    assert not any(call.domain == "remote" and call.service == "turn_off" for call in daily_devices)


async def test_program_replacement_preserves_started_immutable_end_snapshot(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    lifecycle = next(iter(engine._activities.values()))
    original_deadline = lifecycle.deadline
    changed = deepcopy(runtime_program)
    changed["routines"][0]["activities"] = []
    await engine.async_replace_program(validate_program(changed))
    assert next(iter(engine._activities.values())).deadline == original_deadline
    await advance(hass, freezer, 45 * 60)
    assert daily_devices[-1].domain == "remote" and daily_devices[-1].service == "turn_off"
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    assert daily_entry.runtime_data.program.routines[0].activities == ()


async def test_file_reload_and_gui_copy_preserve_started_activity_cleanup(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program, tmp_path
):
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    lifecycle = next(iter(engine._activities.values()))
    original_deadline = lifecycle.deadline
    path = tmp_path / "managed.yaml"
    path.write_text(export_yaml(validate_program(runtime_program)))
    hass.config.config_dir = str(tmp_path)
    await engine.source_manager.async_select(
        "file", "managed.yaml", engine.snapshot()["source_revision"]
    )
    changed = deepcopy(runtime_program)
    changed["routines"][0]["activities"] = []
    path.write_text(export_yaml(validate_program(changed)))
    assert (await engine.source_manager.async_reload())["valid"]
    assert next(iter(engine._activities.values())).deadline == original_deadline
    await engine.source_manager.async_select("gui", None, engine.snapshot()["source_revision"])
    assert daily_entry.runtime_data is engine
    assert next(iter(engine._activities.values())).deadline == original_deadline
    await advance(hass, freezer, 45 * 60)
    assert daily_devices[-1].domain == "remote" and daily_devices[-1].service == "turn_off"


async def test_managed_file_restart_restores_plan_session_and_tv_deadline(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program, tmp_path
):
    engine = await load(hass, daily_entry, freezer)
    path = tmp_path / "managed.yaml"
    path.write_text(export_yaml(validate_program(runtime_program)))
    hass.config.config_dir = str(tmp_path)
    await engine.source_manager.async_select(
        "file", "managed.yaml", engine.snapshot()["source_revision"]
    )
    await advance(hass, freezer, 660)
    deadline = next(iter(engine._activities.values())).deadline
    plans = [p.to_dict() for p in engine._plans.values()]
    await engine.async_close(cleanup=False)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    restored = daily_entry.runtime_data
    assert restored.active and restored.session == engine.session
    assert [p.to_dict() for p in restored._plans.values()] == plans
    assert next(iter(restored._activities.values())).deadline == deadline
    assert sum(c.domain == "remote" and c.service == "turn_on" for c in daily_devices) == 1
    await advance(hass, freezer, 45 * 60)
    assert daily_devices[-1].domain == "remote" and daily_devices[-1].service == "turn_off"


async def test_metadata_change_keeps_times_and_handover_deadline(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    engine = await load(hass, daily_entry, freezer)
    deadline, session, generation = engine.handover_deadline, engine.session, engine.generation
    plans = list(engine._plans.values())
    changed = deepcopy(runtime_program)
    changed["name"] = "A renamed household"
    changed["routines"][0]["name"] = "Another label"
    await engine.async_replace_program(validate_program(changed))
    assert list(engine._plans.values()) == plans
    assert (engine.handover_deadline, engine.session, engine.generation) == (
        deadline,
        session,
        generation,
    )


async def test_disarm_stops_fade_and_cleans_owned_tv_only(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    generation = engine.generation
    hass.states.async_set("sensor.alarm", "disarmed")
    await hass.async_block_till_done()
    assert not engine.active and not engine._activities and engine._cancel_timer is None
    count = len(daily_devices)
    await advance(hass, freezer, 3600)
    await engine._async_dispatch(generation)
    assert len(daily_devices) == count
    assert daily_devices[-1].domain == "remote" and daily_devices[-1].service == "turn_off"


async def test_pause_during_stepped_fade_holds_level(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 30)
    observed = observe(hass, "light.proof")
    await engine.async_set_paused(True)
    count = len(daily_devices)
    await advance(hass, freezer, 1000)
    assert len(daily_devices) == count and observe(hass, "light.proof") == observed
    assert engine.enabled and engine.paused and not engine.active


async def test_disarm_during_start_dispatch_gets_only_owned_cleanup(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    submitted, release = asyncio.Event(), asyncio.Event()

    async def slow(call):
        daily_devices.append(call)
        submitted.set()
        await release.wait()
        hass.states.async_set(
            "remote.harmony", "on", {"current_activity": "Watch TV"}, context=call.context
        )

    hass.services.async_register("remote", "turn_on", slow)
    freezer.move_to(dt_util.utcnow() + timedelta(seconds=660))
    async_fire_time_changed(hass, dt_util.utcnow())
    await submitted.wait()
    hass.states.async_set("sensor.alarm", "disarmed")
    await asyncio.sleep(0)
    release.set()
    await hass.async_block_till_done()
    assert not engine.active and not engine._activities
    assert [call.service for call in daily_devices if call.domain == "remote"] == [
        "turn_on",
        "turn_off",
    ]


async def test_dry_run_calls_no_devices_and_switch_to_live_does_not_inherit_ownership(
    hass, daily_entry, daily_devices, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await engine.async_set_dry_run(True)
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 660)
    assert engine._activities and not daily_devices
    assert any(outcome["outcome"] == "would_dispatch" for outcome in engine.outcomes)
    await advance(hass, freezer, 1)
    await engine.async_set_dry_run(False)
    assert not engine._activities
    await advance(hass, freezer, 3600)
    assert not any(call.domain == "remote" for call in daily_devices)
    assert not any(item.dry_run for item in engine._activities.values())


async def test_service_failure_retry_is_bounded_and_unrelated_tv_runs(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    attempts = []

    async def broken(call):
        attempts.append(call)
        raise HomeAssistantError("Virtual failure")

    hass.services.async_register("light", "turn_on", broken)
    await advance(hass, freezer, 660)
    await advance(hass, freezer, 1)
    assert engine._activities
    assert len(attempts) <= 42  # Twenty steps plus one final reconciliation, each at most twice.
    assert "Virtual failure" in engine.last_error


async def test_diagnostics_redact_household_entities_and_names_by_default(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    redacted = str(diagnostics_data(engine))
    assert "light.proof" not in redacted and "remote.harmony" not in redacted
    assert "Daily house" not in redacted
    assert diagnostics_data(engine, include_sensitive=True)["plans"]


async def test_restart_mid_handover_retains_deadline_and_resnapshots_remaining_path(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    deadline = engine.handover_deadline
    await advance(hass, freezer, 300)
    assert hass.states.get("light.proof").attributes["brightness"] == 74
    await engine.async_close(cleanup=False)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    restored = daily_entry.runtime_data
    assert restored.handover_deadline == deadline
    await advance(hass, freezer, 150)
    assert daily_devices[-1].data["brightness"] == 101
    await advance(hass, freezer, 150)
    assert restored.status == "active" and daily_devices[-1].data["brightness"] == 128


async def test_native_fade_uses_capability_and_pause_holds_observed_level(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    hass.states.async_set(
        "light.proof",
        "on",
        {"brightness": 20, "supported_color_modes": ["brightness"], "supported_features": 32},
    )
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 0.1)
    assert len(daily_devices) == 1 and daily_devices[0].data["transition"] == 600
    assert daily_devices[0].data["brightness"] == 128
    await engine.async_set_paused(True)
    assert daily_devices[-1].data["transition"] == 0
    assert daily_devices[-1].data["brightness"] == 128
    count = len(daily_devices)
    await advance(hass, freezer, 1000)
    assert len(daily_devices) == count


async def test_manual_light_override_yields_and_does_not_cancel_another_actors_fade(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    hass.states.async_set(
        "light.proof",
        "on",
        {"brightness": 20, "supported_color_modes": ["brightness"], "supported_features": 32},
    )
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 0.1)
    attrs = dict(hass.states.get("light.proof").attributes) | {"brightness": 80}
    hass.states.async_set("light.proof", "on", attrs, context=Context())
    await hass.async_block_till_done()
    assert "light.proof" in engine._yielded
    await advance(hass, freezer, 1000)
    assert sum(call.domain == "light" for call in daily_devices) == 1
    assert hass.states.get("light.proof").attributes["brightness"] == 80


async def test_stepped_only_ignores_native_transition_support(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    runtime_program["lighting"]["handover"] = {"dimming": "stepped_only"}
    hass.states.async_set(
        "light.proof",
        "on",
        {"brightness": 20, "supported_color_modes": ["brightness"], "supported_features": 32},
    )
    await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 30)
    assert daily_devices[0].data["transition"] == 0
    assert daily_devices[0].data["brightness"] == 25


async def test_non_dimmable_handover_staggers_entities_without_brightness_payload(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    runtime_program["lighting"]["managed_targets"]["entities"].append("light.other")
    runtime_program["lighting"]["baseline"][0]["targets"]["entities"].append("light.other")
    runtime_program["routines"][0]["steps"][0]["actions"][0]["targets"]["entities"].append(
        "light.other"
    )
    for entity in ("light.proof", "light.other"):
        hass.states.async_set(entity, "off", {"supported_color_modes": ["onoff"]})
    engine = await load(hass, daily_entry, freezer)
    calls = sorted(e for e in engine._queue if e.kind == "handover")
    assert len(calls) == 2 and calls[0].at != calls[1].at
    await advance(hass, freezer, 299)
    assert not daily_devices
    await advance(hass, freezer, (calls[0].at - dt_util.utcnow()).total_seconds())
    assert len(daily_devices) == 1
    await advance(hass, freezer, (calls[1].at - dt_util.utcnow()).total_seconds())
    assert len(daily_devices) == 2
    assert all(set(call.data) == {"entity_id"} for call in daily_devices)


@pytest.mark.parametrize("already_on", [False, True])
async def test_overlapping_window_leases_and_preexisting_on_protection(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program, already_on
):
    runtime_program["lighting"] = {}
    routine = runtime_program["routines"][0]
    routine["steps"] = []
    routine["activities"] = []
    routine["activity_windows"] = [
        {
            "id": "use",
            "name": "Room use",
            "between": {"start": {"clock": "18:01"}, "end": {"clock": "18:03"}},
            "cycles": {"fixed": 2},
            "on_duration": {"fixed": "2m"},
            "overlap": True,
            "targets": {"entities": ["light.proof"]},
        }
    ]
    attrs = dict(hass.states.get("light.proof").attributes)
    hass.states.async_set("light.proof", "on" if already_on else "off", attrs)
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 60)
    assert hass.states.get("light.proof").state == "on"
    assert len(engine._leases["light.proof"]) == 2
    await advance(hass, freezer, 120)
    assert hass.states.get("light.proof").state == ("on" if already_on else "off")
    assert sum(call.service == "turn_off" for call in daily_devices) == (0 if already_on else 1)


async def test_safety_intent_suppresses_later_explicit_and_random_reactivation(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    runtime_program["lighting"]["handover"] = {"duration": "0s"}
    routine = runtime_program["routines"][0]
    routine["steps"][0]["actions"][0]["action"] = "safety_off"
    routine["steps"][0]["actions"][0].pop("data")
    routine["steps"][1]["actions"][0]["action"] = "turn_on"
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 1)
    assert hass.states.get("light.proof").state == "off"
    await advance(hass, freezer, 12 * 60)
    assert hass.states.get("light.proof").state == "off"
    assert any(value["status"] == "safety_priority" for value in engine._journal.values())


async def test_storage_write_failure_prevents_device_dispatch(
    hass, daily_entry, daily_devices, daily_permission, freezer, monkeypatch
):
    engine = await load(hass, daily_entry, freezer)

    async def fail_write(*args):
        raise WriteError("Virtual disk full")

    with monkeypatch.context() as patch:
        patch.setattr(Store, "_async_write_data", fail_write)
        await advance(hass, freezer, 30)
        assert not daily_devices and not engine.active
        assert engine._storage_failed and "Virtual disk full" in engine.last_error
    await engine.async_set_enabled(True)
    assert engine.active


async def test_opaque_declared_effects_wait_until_handover_completion(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    hass.states.async_set("script.proof", "off")
    script_calls = []

    async def script(call):
        script_calls.append(call)

    hass.services.async_register("script", "turn_on", script)
    runtime_program["routines"][0]["steps"].append(
        {
            "id": "opaque",
            "name": "Declared script",
            "when": {"clock_range": {"earliest": "18:05", "latest": "18:05"}},
            "actions": [
                {
                    "action": "script.turn_on",
                    "targets": {"entities": ["script.proof"]},
                    "resources": ["light.proof"],
                }
            ],
        }
    )
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 300)
    assert not script_calls
    assert any(o["outcome"] == "deferred_handover" for o in engine.outcomes)
    await advance(hass, freezer, 300)
    assert len(script_calls) == 1


async def test_registered_generic_service_schema_errors_do_not_stall_other_work(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    hass.states.async_set("script.proof", "off")
    calls = []

    async def script(call):
        calls.append(call)

    hass.services.async_register(
        "script", "turn_on", script, schema=vol.Schema({vol.Required("entity_id"): cv.entity_ids})
    )
    runtime_program["routines"][0]["steps"].append(
        {
            "id": "bad_data",
            "name": "Invalid installed service payload",
            "when": {"clock_range": {"earliest": "18:01", "latest": "18:01"}},
            "actions": [
                {
                    "action": "script.turn_on",
                    "targets": {"entities": ["script.proof"]},
                    "data": {"unsupported": "value"},
                }
            ],
        }
    )
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    assert not calls and engine._activities
    assert "unsupported" in engine.last_error


async def test_activity_waits_for_bounded_observed_confirmation_without_moving_deadline(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    starts = []

    async def delayed_observation(call):
        starts.append(call)

    hass.services.async_register("remote", "turn_on", delayed_observation)
    await advance(hass, freezer, 660)
    lifecycle = next(iter(engine._activities.values()))
    assert lifecycle.phase == "confirming"
    deadline = lifecycle.deadline
    hass.states.async_set(
        "remote.harmony", "on", {"current_activity": "Watch TV"}, context=starts[0].context
    )
    await advance(hass, freezer, 1)
    assert lifecycle.phase == "running" and lifecycle.deadline == deadline
    assert len(starts) == 1


async def test_partial_start_cleanup_only_targets_acquired_resources(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    hass.states.async_set("remote.other", "off", {"current_activity": "PowerOff"})
    activity = runtime_program["routines"][0]["activities"][0]
    activity["resources"].append("remote.other")
    activity["on_start"][0]["targets"]["entities"].append("remote.other")
    activity["on_start"][0]["stagger"] = {"fixed": "1m"}
    activity["on_end"][0]["targets"]["entities"].append("remote.other")
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    await engine.async_set_paused(True)
    ends = [
        call for call in daily_devices if call.domain == "remote" and call.service == "turn_off"
    ]
    assert len(ends) == 1 and ends[0].data["entity_id"] == ["remote.harmony"]
    assert hass.states.get("remote.other").state == "off"


async def test_separate_ownership_attribute_change_suppresses_cleanup_even_if_restored(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    hass.states.async_set("sensor.player", "ready", {"owner": "occupied"})
    runtime_program["routines"][0]["activities"][0]["ownership_conditions"].append(
        {
            "condition": "state",
            "entity_id": "sensor.player",
            "attribute": "owner",
            "state": "occupied",
        }
    )
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    assert engine._activities
    hass.states.async_set("sensor.player", "ready", {"owner": "human"})
    await hass.async_block_till_done()
    hass.states.async_set("sensor.player", "ready", {"owner": "occupied"})
    await advance(hass, freezer, 2700)
    assert not engine._activities
    assert not any(c.domain == "remote" and c.service == "turn_off" for c in daily_devices)


async def test_late_dispatch_keeps_full_duration_after_success(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 900)
    lifecycle = next(iter(engine._activities.values()))
    assert lifecycle.deadline == dt_util.utcnow() + timedelta(minutes=45)
    await advance(hass, freezer, 2699)
    assert hass.states.get("remote.harmony").state == "on"
    await advance(hass, freezer, 1)
    assert hass.states.get("remote.harmony").state == "off"


async def test_duration_begins_after_last_staggered_start(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    hass.states.async_set("remote.other", "off", {"current_activity": "PowerOff"})
    activity = runtime_program["routines"][0]["activities"][0]
    activity["resources"].append("remote.other")
    activity["on_start"][0]["targets"]["entities"].append("remote.other")
    activity["on_start"][0]["stagger"] = {"fixed": "1m"}
    activity["on_end"][0]["targets"]["entities"].append("remote.other")
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    lifecycle = next(iter(engine._activities.values()))
    assert lifecycle.deadline is None and lifecycle.phase == "starting"
    await advance(hass, freezer, 90)
    assert lifecycle.deadline == dt_util.utcnow() + timedelta(minutes=45)
    assert lifecycle.phase == "running"


async def test_late_start_that_exceeds_within_runs_only_owned_cancellation(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    activity = runtime_program["routines"][0]["activities"][0]
    activity["within"] = {"start": {"clock": "18:11"}, "end": {"clock": "18:56"}}
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 900)
    assert not engine._activities
    assert [c.service for c in daily_devices if c.domain == "remote"] == ["turn_on", "turn_off"]
    assert any(o["outcome"] == "deadline_constraint" for o in engine.outcomes)


async def test_leave_running_policy_releases_activity_on_stop(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    runtime_program["routines"][0]["activities"][0]["stop_behavior"] = "leave_running"
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    await engine.async_set_enabled(False)
    await advance(hass, freezer, 3600)
    assert not engine._activities and hass.states.get("remote.harmony").state == "on"
    assert not any(c.domain == "remote" and c.service == "turn_off" for c in daily_devices)


async def test_entry_unload_ends_owned_activity_and_removes_all_timers(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    assert await hass.config_entries.async_unload(daily_entry.entry_id)
    assert engine.closed and not engine._activities and engine._cancel_timer is None
    count = len(daily_devices)
    await advance(hass, freezer, 86400)
    assert len(daily_devices) == count and hass.states.get("remote.harmony").state == "off"


async def test_unknown_gate_waits_and_unavailable_target_does_not_block_tv(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    hass.states.async_set("sensor.alarm", "unknown")
    hass.states.async_set("light.proof", "unavailable")
    engine = await load(hass, daily_entry, freezer)
    assert not engine.active and engine.status == "waiting"
    hass.states.async_set("sensor.alarm", "armed")
    await hass.async_block_till_done()
    assert engine.active
    await advance(hass, freezer, 660)
    assert engine._activities and all(c.domain == "remote" for c in daily_devices)


async def test_pending_generic_dispatch_is_not_replayed_after_restart(
    hass, daily_entry, daily_devices, daily_permission, freezer, hass_storage
):
    engine = await load(hass, daily_entry, freezer)
    plan = engine._plan_at(dt_util.utcnow())
    start = next(e for e in plan.events if e.kind == "activity_start")
    key = engine._key(plan, start)
    engine._journal[key] = {
        "status": "pending",
        "date": plan.simulation_date.isoformat(),
        "intended": start.action.to_dict(),
    }
    await engine.async_close(cleanup=False)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    restored = daily_entry.runtime_data
    await advance(hass, freezer, 3600)
    assert restored._journal[key]["status"] == "uncertain"
    assert not any(c.domain == "remote" for c in daily_devices)


async def test_corrupt_saved_plan_regenerates_without_losing_owned_cleanup(
    hass, daily_entry, daily_devices, daily_permission, freezer, hass_storage
):
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    deadline = next(iter(engine._activities.values())).deadline
    await engine.async_close(cleanup=False)
    data = hass_storage[f"occupied.{daily_entry.entry_id}.runtime"]["data"]
    data["plans"][0]["planner_version"] = -1
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    restored = daily_entry.runtime_data
    assert next(iter(restored._activities.values())).deadline == deadline
    assert any(o["outcome"] == "invalid_plan" for o in restored.outcomes)
    await advance(hass, freezer, 2700)
    assert [c.service for c in daily_devices if c.domain == "remote"] == ["turn_on", "turn_off"]


async def test_daily_boundary_keeps_activity_deadline_and_session(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    runtime_program["lighting"] = {}
    runtime_program["routines"][0]["steps"] = []
    activity = runtime_program["routines"][0]["activities"][0]
    activity["when"] = {"clock_range": {"earliest": "01:59", "latest": "01:59"}}
    activity["duration"] = {"fixed": "4m"}
    activity["allow_cross_boundary"] = True
    engine = await load(hass, daily_entry, freezer, at="2026-10-07T01:58:00+00:00")
    session, seed = engine.session, engine._seed
    await advance(hass, freezer, 60)
    deadline = next(iter(engine._activities.values())).deadline
    previous_seed = engine._plan_at(dt_util.utcnow()).seed
    await advance(hass, freezer, 60)
    assert engine._plan_at(dt_util.utcnow()).simulation_date.isoformat() == "2026-10-07"
    assert engine._plan_at(dt_util.utcnow()).seed != previous_seed
    assert next(iter(engine._activities.values())).deadline == deadline
    assert (engine.session, engine._seed) == (session, seed)
    await advance(hass, freezer, 180)
    assert [c.service for c in daily_devices if c.domain == "remote"] == ["turn_on", "turn_off"]


async def test_window_lease_and_projection_carry_across_daily_boundary(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    runtime_program["lighting"]["handover"] = {"duration": "0s"}
    routine = runtime_program["routines"][0]
    routine["steps"] = routine["activities"] = []
    routine["activity_windows"] = [
        {
            "id": "late_use",
            "name": "Cross-boundary use",
            "allow_cross_boundary": True,
            "between": {
                "start": {"clock": "01:59"},
                "end": {"clock": "02:03"},
                "cross_midnight": True,
            },
            "cycles": {"fixed": 1},
            "on_duration": {"fixed": "4m"},
            "targets": {"entities": ["light.proof"]},
        }
    ]
    attrs = dict(hass.states.get("light.proof").attributes)
    hass.states.async_set("light.proof", "off", attrs)
    engine = await load(hass, daily_entry, freezer, at="2026-10-07T01:58:00+00:00")
    await advance(hass, freezer, 60)
    await advance(hass, freezer, 60)
    assert hass.states.get("light.proof").state == "on"
    assert engine._leases["light.proof"]
    assert not any(c.service == "turn_off" for c in daily_devices)
    await advance(hass, freezer, 180)
    assert hass.states.get("light.proof").state == "off"
    assert sum(c.service == "turn_off" for c in daily_devices) == 1


async def test_infeasible_program_apply_keeps_last_valid_program_and_queue(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    engine = await load(hass, daily_entry, freezer)
    before = engine.snapshot()
    changed = deepcopy(runtime_program)
    changed["routines"][0]["activities"][0]["within"] = {
        "start": {"clock": "18:11"},
        "end": {"clock": "18:12"},
    }
    with pytest.raises(ProgramError):
        await engine.async_replace_program(validate_program(changed))
    assert engine.snapshot() == before and not daily_devices


async def test_superseded_brightness_retries_do_not_regress_newer_step(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    engine = await load(hass, daily_entry, freezer)
    original = hass.services._services["light"]["turn_on"].job.target
    attempts = []

    async def transient(call):
        attempts.append(call)
        if len(attempts) == 1:
            raise HomeAssistantError("First step failed")
        await original(call)

    hass.services.async_register("light", "turn_on", transient)
    await advance(hass, freezer, 300)
    assert hass.states.get("light.proof").attributes["brightness"] == 74
    await advance(hass, freezer, 1)
    assert hass.states.get("light.proof").attributes["brightness"] == 74
    assert any(o["outcome"] == "superseded_retry" for o in engine.outcomes)


async def test_native_progress_with_own_context_is_recovered_without_false_yield(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    attrs = dict(hass.states.get("light.proof").attributes) | {"supported_features": 32}
    hass.states.async_set("light.proof", "on", attrs)
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 0.1)
    own_context = daily_devices[-1].context
    deadline = engine.handover_deadline
    await engine.async_close(cleanup=False)
    attrs["brightness"] = 74
    hass.states.async_set("light.proof", "on", attrs, context=own_context)
    await advance(hass, freezer, 300)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    restored = daily_entry.runtime_data
    assert "light.proof" not in restored._yielded and restored.handover_deadline == deadline


async def test_native_fade_is_cancellable_immediately_after_restart(
    hass, daily_entry, daily_devices, daily_permission, freezer
):
    attrs = dict(hass.states.get("light.proof").attributes) | {"supported_features": 32}
    hass.states.async_set("light.proof", "on", attrs)
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 0.1)
    await engine.async_close(cleanup=False)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    await daily_entry.runtime_data.async_set_paused(True)
    assert daily_devices[-1].data["transition"] == 0


async def test_dry_run_uses_virtual_leases_and_survives_restart_without_calls(
    hass, daily_entry, daily_devices, freezer, runtime_program
):
    runtime_program["lighting"] = {}
    routine = runtime_program["routines"][0]
    routine["steps"] = routine["activities"] = []
    routine["activity_windows"] = [
        {
            "id": "use",
            "name": "Room use",
            "between": {"start": {"clock": "18:01"}, "end": {"clock": "18:03"}},
            "cycles": {"fixed": 1},
            "on_duration": {"fixed": "2m"},
            "targets": {"entities": ["light.proof"]},
        }
    ]
    attrs = dict(hass.states.get("light.proof").attributes)
    hass.states.async_set("light.proof", "off", attrs)
    engine = await load(hass, daily_entry, freezer)
    await hass.services.async_call(
        "occupied",
        "set_dry_run",
        {"config_entry_id": daily_entry.entry_id, "dry_run": True},
        blocking=True,
    )
    await engine.async_set_enabled(True)
    await advance(hass, freezer, 60)
    assert engine._observe("light.proof")["state"] == "on"
    await engine.async_close(cleanup=False)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    restored = daily_entry.runtime_data
    assert restored.dry_run and restored._observe("light.proof")["state"] == "on"
    await advance(hass, freezer, 120)
    assert restored._observe("light.proof")["state"] == "off"
    assert hass.states.get("light.proof").state == "off" and not daily_devices


async def test_authenticated_apply_yaml_preserves_active_lifecycle_and_metadata_timing(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program, hass_ws_client
):
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    deadline = next(iter(engine._activities.values())).deadline
    client = await hass_ws_client(hass)
    renamed = deepcopy(runtime_program)
    renamed["name"] = "Updated household"
    before = engine.snapshot()["events"]
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/apply",
            "config_entry_id": daily_entry.entry_id,
            "program": export_yaml(validate_program(renamed)),
        }
    )
    result = await client.receive_json()
    assert result["success"] and result["result"]["valid"]
    assert engine.snapshot()["events"] == before and engine.program.name == "Updated household"
    renamed["routines"][0]["activities"] = []
    await client.send_json(
        {
            "id": 2,
            "type": "occupied/apply",
            "config_entry_id": daily_entry.entry_id,
            "program": renamed,
        }
    )
    result = await client.receive_json()
    assert result["result"]["valid"] and daily_entry.runtime_data is engine
    assert next(iter(engine._activities.values())).deadline == deadline
    await client.close()
    await advance(hass, freezer, 2700)
    assert [c.service for c in daily_devices if c.domain == "remote"] == ["turn_on", "turn_off"]


async def test_apply_validation_failure_does_not_change_live_program(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program, hass_ws_client
):
    engine = await load(hass, daily_entry, freezer)
    before = engine.snapshot()
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/apply",
            "config_entry_id": daily_entry.entry_id,
            "program": runtime_program | {"typo": True},
        }
    )
    result = await client.receive_json()
    assert result["success"] and not result["result"]["valid"]
    assert result["result"]["issues"][0]["path"] == "$.typo"
    assert engine.snapshot() == before and not daily_devices


@pytest.mark.parametrize("sensitive", [False, True])
async def test_authenticated_diagnostics_require_explicit_sensitive_export(
    hass, daily_entry, daily_devices, daily_permission, freezer, hass_ws_client, sensitive
):
    await load(hass, daily_entry, freezer)
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/diagnostics",
            "config_entry_id": daily_entry.entry_id,
            "include_sensitive": sensitive,
        }
    )
    result = await client.receive_json()
    assert result["success"]
    assert ("light.proof" in str(result["result"])) is sensitive
    assert ("Daily house" in str(result["result"])) is sensitive


@pytest.mark.parametrize("command", ["occupied/apply", "occupied/diagnostics"])
async def test_mutating_and_diagnostic_api_require_admin(
    hass,
    daily_entry,
    daily_devices,
    daily_permission,
    freezer,
    runtime_program,
    hass_ws_client,
    hass_read_only_access_token,
    command,
):
    engine = await load(hass, daily_entry, freezer)
    before = engine.snapshot()
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    msg = {"id": 1, "type": command, "config_entry_id": daily_entry.entry_id}
    if command == "occupied/apply":
        msg["program"] = runtime_program
    await client.send_json(msg)
    result = await client.receive_json()
    assert not result["success"] and result["error"]["code"] == "unauthorized"
    assert engine.snapshot() == before and not daily_devices


async def test_import_flow_loads_canonical_program_without_proof_settings(
    hass, daily_devices, freezer, runtime_program
):
    freezer.move_to("2026-10-06T18:00:00+00:00")
    result = await hass.config_entries.flow.async_init(
        "occupied",
        context={"source": "import"},
        data=export_yaml(validate_program(runtime_program)),
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"]["program"] == program_data(validate_program(runtime_program))
    await hass.async_block_till_done()
    engine = result["result"].runtime_data
    assert isinstance(engine, DailyEngine) and not engine.enabled and not daily_devices


async def test_apply_upgrades_proof_entry_and_cleans_owned_proof_activity(
    hass, entry, daily_devices, saved_permission, freezer, runtime_program, hass_ws_client
):
    hass.set_state(CoreState.running)
    assert await hass.config_entries.async_setup(entry.entry_id)
    old = entry.runtime_data
    await advance(hass, freezer, 75)
    assert old.remote_owned
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/apply",
            "config_entry_id": entry.entry_id,
            "program": runtime_program,
        }
    )
    result = await client.receive_json()
    assert result["success"] and result["result"]["valid"]
    assert isinstance(entry.runtime_data, DailyEngine) and old.closed
    assert hass.states.get("remote.harmony").state == "off"
    assert not entry.runtime_data._activities
    await client.close()


async def test_infeasible_first_apply_preserves_proof_entry(
    hass, entry, daily_devices, freezer, runtime_program, hass_ws_client
):
    assert await hass.config_entries.async_setup(entry.entry_id)
    old = entry.runtime_data
    runtime_program["routines"][0]["activities"][0]["within"] = {
        "start": {"clock": "18:11"},
        "end": {"clock": "18:12"},
    }
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/apply",
            "config_entry_id": entry.entry_id,
            "program": runtime_program,
        }
    )
    result = await client.receive_json()
    assert not result["success"] and result["error"]["code"] == "apply_failed"
    assert entry.runtime_data is old and not old.closed and not daily_devices
    await client.close()


async def test_cold_activation_projects_multi_day_window_leases(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    routine = runtime_program["routines"][0]
    routine["steps"] = routine["activities"] = []
    routine["activity_windows"] = [
        {
            "id": "long_use",
            "name": "Multi-day use",
            "allow_cross_boundary": True,
            "between": {"start": {"clock": "18:00"}, "end": {"clock": "18:00", "offset": "48h"}},
            "cycles": {"fixed": 1},
            "on_duration": {"fixed": "48h"},
            "targets": {"entities": ["light.proof"]},
            "data": {"brightness_pct": 60},
        }
    ]
    attrs = dict(hass.states.get("light.proof").attributes)
    hass.states.async_set("light.proof", "off", attrs)
    engine = await load(hass, daily_entry, freezer, at="2026-10-06T17:00:00+00:00")
    assert engine.snapshot()["handover"]["light.proof"]["target"]["state"] == "on"
    await advance(hass, freezer, 600)
    assert hass.states.get("light.proof").attributes["brightness"] == 153
    assert len(engine._leases["light.proof"]) == 2
    await advance(hass, freezer, 3000)
    assert hass.states.get("light.proof").state == "on"
    assert len(engine._leases["light.proof"]) == 2
    assert not any(c.service == "turn_off" for c in daily_devices)


async def test_oversized_runtime_program_is_rejected_before_sampling(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program, monkeypatch
):
    engine = await load(hass, daily_entry, freezer)
    before = engine.snapshot()
    changed = deepcopy(runtime_program)
    changed["routines"][0]["activity_windows"] = [
        {
            "id": "huge",
            "name": "Too many live events",
            "between": {"start": {"clock": "18:00"}, "end": {"clock": "19:00"}},
            "cycles": {"fixed": 1000},
            "overlap": True,
            "on_duration": {"fixed": "1s"},
            "targets": {"entities": [f"light.room_{i}" for i in range(50)]},
        }
    ]

    def no_sampling(*args, **kwargs):
        pytest.fail("Oversized program must be rejected before plan allocation")

    monkeypatch.setattr("custom_components.occupied.engine_daily.preview_dates", no_sampling)
    with pytest.raises(ProgramError, match="Maximum live plan"):
        await engine.async_replace_program(validate_program(changed))
    assert engine.snapshot() == before and not daily_devices


async def test_restart_after_end_dispatch_keeps_remaining_staggered_cleanup(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program, hass_storage
):
    hass.states.async_set("remote.other", "off", {"current_activity": "PowerOff"})
    activity = runtime_program["routines"][0]["activities"][0]
    activity["duration"] = {"fixed": "3m"}
    activity["resources"].append("remote.other")
    for action in (activity["on_start"][0], activity["on_end"][0]):
        action["targets"]["entities"].append("remote.other")
        action["stagger"] = {"fixed": "1m"}
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    await advance(hass, freezer, 60)
    await advance(hass, freezer, 180)
    lifecycle = next(iter(engine._activities.values()))
    assert lifecycle.completed_ends == {0}
    await engine.async_close(cleanup=False)
    saved = hass_storage[f"occupied.{daily_entry.entry_id}.runtime"]["data"]
    # Crash after the known dispatch journal, before updating its lifecycle snapshot.
    saved["activities"][0]["completed_ends"] = []
    saved["activities"][0]["observed"]["remote.harmony"] = {
        "state": "on",
        "attributes": {"current_activity": "Watch TV"},
    }
    await advance(hass, freezer, 30)
    assert await hass.config_entries.async_reload(daily_entry.entry_id)
    restored = daily_entry.runtime_data
    assert next(iter(restored._activities.values())).completed_ends == {0}
    assert hass.states.get("remote.other").state == "on"
    await advance(hass, freezer, 30)
    assert not restored._activities and hass.states.get("remote.other").state == "off"
    ends = [c for c in daily_devices if c.domain == "remote" and c.service == "turn_off"]
    assert len(ends) == 2


async def test_partial_start_does_not_run_opaque_cleanup_touching_unacquired_resource(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    hass.states.async_set("remote.other", "off", {"current_activity": "PowerOff"})
    hass.states.async_set("script.cleanup", "off")
    calls = []

    async def cleanup(call):
        calls.append(call)

    hass.services.async_register("script", "turn_on", cleanup)
    activity = runtime_program["routines"][0]["activities"][0]
    activity["resources"].append("remote.other")
    activity["on_start"][0]["targets"]["entities"].append("remote.other")
    activity["on_start"][0]["stagger"] = {"fixed": "1m"}
    activity["on_end"] = [
        {
            "action": "script.turn_on",
            "targets": {"entities": ["script.cleanup"]},
            "resources": ["remote.harmony", "remote.other"],
        }
    ]
    engine = await load(hass, daily_entry, freezer)
    await advance(hass, freezer, 660)
    await engine.async_set_paused(True)
    assert not calls and not engine._activities
    assert any(o["outcome"] == "unacquired_resource" for o in engine.outcomes)


async def test_sensitive_diagnostics_still_redact_credentials_and_error_echoes(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    activity = runtime_program["routines"][0]["activities"][0]
    activity["on_start"][0]["data"]["api_key"] = "private-api-value"
    activity["on_end"][0]["data"] = {"nested": {"Authorization": "private-bearer-value"}}
    engine = await load(hass, daily_entry, freezer)
    engine.last_error = "Service rejected private-api-value"
    result = diagnostics_data(engine, include_sensitive=True)
    assert "private-api-value" not in str(result) and "private-bearer-value" not in str(result)
    assert "remote.harmony" in str(result) and "**REDACTED**" in str(result)
    assert (
        engine.program.routines[0].activities[0].on_start[0].data["api_key"] == "private-api-value"
    )


async def test_disarm_during_pre_dispatch_commit_prevents_the_service_call(
    hass, daily_entry, daily_devices, daily_permission, freezer, monkeypatch
):
    engine = await load(hass, daily_entry, freezer)
    original = engine._store.async_save

    async def save_then_disarm(data):
        await original(data)
        if any(
            v.get("status") == "pending" and v.get("intended", {}).get("action") == "remote.turn_on"
            for v in data["journal"].values()
        ):
            hass.states.async_set("sensor.alarm", "disarmed")
            await asyncio.sleep(0)

    monkeypatch.setattr(engine._store, "async_save", save_then_disarm)
    await advance(hass, freezer, 660)
    assert not engine.active and not engine._activities
    assert not any(c.domain == "remote" for c in daily_devices)
    assert any(o["outcome"] == "cancelled_before_dispatch" for o in engine.outcomes)


async def test_changed_time_source_reschedules_pending_step_without_replaying_completed_step(
    hass, daily_entry, daily_devices, daily_permission, freezer, runtime_program
):
    runtime_program["routines"][0]["steps"] = [
        {
            "id": "alarm_step",
            "name": "Alarm step",
            "when": {
                "entity_range": {
                    "entity_id": "input_datetime.alarm",
                    "offset_range": {"fixed": "0s"},
                }
            },
            "actions": [{"action": "remote.turn_off", "targets": {"entities": ["remote.harmony"]}}],
        }
    ]
    hass.states.async_set("input_datetime.alarm", "18:30:00", {"has_time": True, "has_date": False})
    hass.states.async_set("remote.harmony", "on")
    engine = await load(hass, daily_entry, freezer)
    handover_events = [event.key for event in engine._queue if event.kind.startswith("handover")]
    deadline = engine.handover_deadline
    assert engine._plans[dt_util.utcnow().date()].step_times["alarm_step"].hour == 18
    hass.states.async_set("input_datetime.alarm", "18:01:00", {"has_time": True, "has_date": False})
    await hass.async_block_till_done()
    assert engine._plans[dt_util.utcnow().date()].step_times["alarm_step"].minute == 1
    assert all(any(event.key == key for event in engine._queue) for key in handover_events)
    assert engine.handover_deadline == deadline
    await advance(hass, freezer, 60)
    off_calls = [
        call for call in daily_devices if call.domain == "remote" and call.service == "turn_off"
    ]
    assert len(off_calls) == 1
    hass.states.async_set("input_datetime.alarm", "18:02:00", {"has_time": True, "has_date": False})
    await hass.async_block_till_done()
    await advance(hass, freezer, 60)
    assert (
        len(
            [
                call
                for call in daily_devices
                if call.domain == "remote" and call.service == "turn_off"
            ]
        )
        == 1
    )
