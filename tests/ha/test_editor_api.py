"""Editor revision isolation, native-schema validation and actual runtime streams."""

import json
import subprocess
from copy import deepcopy
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
import voluptuous as vol
from homeassistant.components import light, remote
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.occupied.editor import program_document
from custom_components.occupied.file_config import load_program
from custom_components.occupied.validation import program_data, validate_program


@pytest.fixture(autouse=True)
def editor_clock(freezer, monkeypatch):
    freezer.move_to("2026-10-06T18:00:00+00:00")
    # Native descriptions for the installed virtual domains, without importing
    # unrelated optional integration requirements into the minimal HA harness.
    monkeypatch.setattr(
        "homeassistant.helpers.service._base_components", lambda: {"light": light, "remote": remote}
    )


@pytest.fixture
def editor_entry(hass, program_dict):
    entry = MockConfigEntry(
        domain="occupied",
        unique_id="occupied",
        title="House",
        data={"program": program_data(validate_program(program_dict)), "name": "House"},
    )
    entry.add_to_hass(hass)
    for entity in ("light.a", "light.b"):
        hass.states.async_set(entity, "off", {"supported_color_modes": ["brightness"]})
    return entry


async def request(client, command, entry, identifier=1, **data):
    await client.send_json(
        {"id": identifier, "type": command, "config_entry_id": entry.entry_id, **data}
    )
    return await client.receive_json()


async def test_read_starter_and_catalog_do_not_replace_proof_or_call_devices(
    hass, entry, devices, hass_ws_client
):
    assert await hass.config_entries.async_setup(entry.entry_id)
    engine = entry.runtime_data
    before = engine.snapshot()
    client = await hass_ws_client(hass)
    doc = (await request(client, "occupied/program", entry))["result"]
    assert doc["needs_apply"] and doc["revision"].startswith("proof:")
    assert set(doc["program"]["steps"]) == {"evening_on", "bedtime"}
    catalog = (await request(client, "occupied/catalog", entry, 2))["result"]
    assert any(e["entity_id"] == "light.proof" and e["dimmable"] for e in catalog["entities"])
    assert "turn_on" in catalog["services"]["light"]
    assert entry.runtime_data is engine and engine.snapshot() == before and not devices


async def test_shared_step_entities_need_no_baseline(
    hass, editor_entry, devices, program_dict, hass_ws_client
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    client = await hass_ws_client(hass)
    result = (
        await request(client, "occupied/editor_validate", editor_entry, program=program_dict)
    )["result"]
    assert result["valid"]
    assert all(i["code"] != "undefined_baseline" for i in result.get("issues", []))
    assert not devices


@pytest.mark.parametrize("state", [None, "unknown", "unavailable"])
async def test_entity_warnings_survive_save_and_reload_and_clear_on_recovery(
    hass, editor_entry, devices, program_dict, hass_ws_client, state
):
    program_dict["random"] = {
        "lamp": {
            "start": {"absolute_time": {"start": "18:00"}},
            "end": {"duration": {"min": "1h"}},
            "on": {"action": "turn_on", "entities": ["light.a"]},
            "off": {"action": "turn_off", "entities": ["light.a"]},
        }
    }
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    if state is None:
        hass.states.async_remove("light.a")
    else:
        hass.states.async_set("light.a", state)
    client = await hass_ws_client(hass)
    validation = (
        await request(client, "occupied/editor_validate", editor_entry, program=program_dict)
    )["result"]
    assert validation["valid"]
    expected_paths = {
        ("steps", "wake", "entities"),
        ("steps", "leave", "entities"),
        ("random", "lamp", "on", "entities"),
        ("random", "lamp", "off", "entities"),
    }

    def assert_warnings(issues):
        warnings = [issue for issue in issues if issue["code"] == "entity_unavailable"]
        assert {tuple(issue["model_path"]) for issue in warnings} == expected_paths
        assert all(issue["severity"] == "warning" for issue in warnings)

    assert_warnings(validation["issues"])
    document = program_document(editor_entry.runtime_data)
    saved = (
        await request(
            client,
            "occupied/save",
            editor_entry,
            2,
            program=program_dict,
            expected_revision=document["revision"],
        )
    )["result"]
    assert saved["valid"]
    assert_warnings(saved["warnings"])
    loaded = (await request(client, "occupied/program", editor_entry, 3))["result"]
    assert_warnings(loaded["warnings"])
    hass.states.async_set("light.a", "off")
    recovered = (await request(client, "occupied/program", editor_entry, 4))["result"]
    assert not any(issue["code"] == "entity_unavailable" for issue in recovered["warnings"])
    assert not devices


@pytest.mark.parametrize("count", [0, 3, {"min": 0, "max": 1}, {"min": 2, "max": 6}])
async def test_random_actions_validate_save_preview_and_export(
    hass, editor_entry, devices, program_dict, hass_ws_client, count
):
    program_dict["random"] = {
        "lamp": {
            "start": {"relative_to": {"step": "wake"}},
            "end": {"relative_to": {"step": "leave"}},
            "min_duration": "1m",
            "max_duration": "5m",
            "count": count,
            "on": {
                "action": "light.turn_on",
                "entities": ["light.a"],
                "data": {"brightness_pct": 60},
            },
            "off": {"action": "turn_off", "entities": ["light.a"]},
        }
    }
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    client = await hass_ws_client(hass)
    doc = program_document(editor_entry.runtime_data)
    result = (
        await request(
            client,
            "occupied/save",
            editor_entry,
            program=program_dict,
            expected_revision=doc["revision"],
        )
    )["result"]
    assert result["valid"] and "lamp" in result["program"]["random"]
    assert result["program"]["random"]["lamp"].get("count", 3) == count
    preview = (
        await request(
            client,
            "occupied/preview",
            editor_entry,
            2,
            date="2026-10-06",
            days=1,
        )
    )["result"]
    assert preview["valid"]
    occurrences = len(
        [event for event in preview["plans"][0]["events"] if event["kind"] == "random_start"]
    )
    if isinstance(count, int):
        assert occurrences == count
    else:
        assert count["min"] <= occurrences <= count["max"]
    exported = (
        await request(client, "occupied/export", editor_entry, 3, program=result["program"])
    )["result"]
    assert load_program(exported["yaml"]) == editor_entry.runtime_data.program
    renamed = (
        await request(
            client,
            "occupied/rename_id",
            editor_entry,
            4,
            program=result["program"],
            kind="step",
            old="wake",
            new="morning",
        )
    )["result"]
    assert renamed["program"]["random"]["lamp"]["start"]["relative_to"]["step"] == "morning"
    assert not devices
    program_dict["random"]["lamp"]["on"]["data"]["entity_id"] = "light.b"
    invalid = (
        await request(client, "occupied/editor_validate", editor_entry, 5, program=program_dict)
    )["result"]
    assert not invalid["valid"]
    assert invalid["issues"][0]["model_path"] == ["random", "lamp", "on", "data"]
    assert not devices


async def test_window_duration_inputs_and_random_dependencies_validate_and_save(
    hass, editor_entry, devices, program_dict, hass_ws_client
):
    program_dict["random"] = {
        "first": {
            "start": {"absolute_time": {"start": "18:00"}},
            "end": {"duration": {"min": "1m", "max": "2h"}},
            "min_duration": "30s",
            "max_duration": "45s",
            "on": {"action": "turn_on", "entities": ["light.a"]},
            "off": {"action": "turn_off", "entities": ["light.a"]},
        },
        "second": {
            "start": {"relative_to": {"random": "first", "start_offset": "1m"}},
            "end": {"duration": {"min": "5m", "max": "10m"}},
            "min_duration": "30s",
            "max_duration": "45s",
            "on": {"action": "turn_on", "entities": ["light.b"]},
            "off": {"action": "turn_off", "entities": ["light.b"]},
        },
    }
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    client = await hass_ws_client(hass)
    validation = (
        await request(client, "occupied/editor_validate", editor_entry, program=program_dict)
    )["result"]
    assert validation["valid"] and not validation["issues"]
    doc = program_document(editor_entry.runtime_data)
    saved = (
        await request(
            client,
            "occupied/save",
            editor_entry,
            2,
            program=program_dict,
            expected_revision=doc["revision"],
        )
    )["result"]
    assert saved["valid"]
    assert saved["program"]["random"]["first"]["end"] == {"duration": {"min": "1m", "max": "2h"}}
    assert saved["program"]["random"]["second"]["start"]["relative_to"]["random"] == "first"
    assert not devices


async def test_two_editors_cannot_overwrite_each_other(
    hass, editor_entry, devices, program_dict, hass_ws_client
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    first, second = await hass_ws_client(hass), await hass_ws_client(hass)
    revision = program_document(editor_entry.runtime_data)["revision"]
    for client, name in ((first, "First edit"), (second, "Second edit")):
        await client.send_json(
            {
                "id": 1,
                "type": "occupied/save",
                "config_entry_id": editor_entry.entry_id,
                "program": program_dict | {"name": name},
                "expected_revision": revision,
            }
        )
    responses = [await first.receive_json(), await second.receive_json()]
    assert sum(r["success"] for r in responses) == 1
    stale = next(r for r in responses if not r["success"])
    assert stale["error"]["code"] == "revision_conflict"
    assert editor_entry.runtime_data.program.name in {"First edit", "Second edit"}
    assert not devices


async def test_metadata_save_preserves_sampled_plans_generation_and_deadline(
    hass, editor_entry, devices, program_dict, hass_ws_client
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    engine = editor_entry.runtime_data
    await engine.async_set_enabled(True)
    plans, generation, deadline = (
        list(engine._plans.values()),
        engine.generation,
        engine.handover_deadline,
    )
    doc = program_document(engine)
    changed = deepcopy(program_dict)
    changed["steps"]["wake"]["name"] = "Renamed room"
    client = await hass_ws_client(hass)
    result = await request(
        client, "occupied/save", editor_entry, program=changed, expected_revision=doc["revision"]
    )
    assert result["success"] and result["result"]["valid"]
    assert result["result"]["revision"] != doc["revision"]
    assert list(engine._plans.values()) == plans and engine.generation == generation
    assert engine.handover_deadline == deadline


async def test_failed_program_persistence_preserves_last_valid_revision(
    hass, editor_entry, devices, program_dict, hass_ws_client, monkeypatch
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    engine = editor_entry.runtime_data
    doc = program_document(engine)
    monkeypatch.setattr(
        "custom_components.occupied.engine_daily.program_store",
        lambda *args: type(
            "FailedStore",
            (),
            {"async_save": AsyncMock(side_effect=HomeAssistantError("Disk full"))},
        )(),
    )
    client = await hass_ws_client(hass)
    result = await request(
        client,
        "occupied/save",
        editor_entry,
        program=program_dict | {"name": "Unsaved"},
        expected_revision=doc["revision"],
    )
    assert not result["success"] and "Disk full" in result["error"]["message"]
    assert program_document(engine) == doc and not devices


async def test_installed_service_schema_errors_are_reviewable_without_calls_or_save(
    hass, editor_entry, devices, program_dict, hass_ws_client
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    calls = []
    hass.states.async_set("script.custom", "off")

    async def handle(call):
        calls.append(call)

    hass.services.async_register(
        "script", "turn_on", handle, schema=vol.Schema({vol.Required("entity_id"): cv.entity_ids})
    )
    changed = deepcopy(program_dict)
    changed["steps"]["wake"].update(
        action="script.turn_on", entities=["script.custom"], data={"invalid": True}
    )
    client = await hass_ws_client(hass)
    engine = editor_entry.runtime_data
    before = program_document(engine)
    result = (await request(client, "occupied/editor_validate", editor_entry, program=changed))[
        "result"
    ]
    assert not result["valid"]
    issue = next(i for i in result["issues"] if i["code"] == "service_data")
    assert issue["model_path"] == ["steps", "wake", "data"]
    assert program_document(engine) == before and not calls and not devices


async def test_actual_timeline_uses_saved_plan_and_dispatch_outcomes_without_reroll(
    hass, editor_entry, devices, hass_ws_client
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    engine = editor_entry.runtime_data
    await engine.async_set_enabled(True)
    before = engine.snapshot()
    client = await hass_ws_client(hass)
    result = (await request(client, "occupied/timeline", editor_entry))["result"]
    assert result["plan"]["simulation_date"] == "2026-10-06"
    assert any(e["outcome"] == "historical_skipped" for e in result["events"])
    assert engine.snapshot() == before and not devices


async def test_subscription_follows_runtime_and_unsubscribes(
    hass, editor_entry, devices, hass_ws_client
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    client = await hass_ws_client(hass)
    result = await request(client, "occupied/subscribe", editor_entry)
    assert result["success"]
    initial = await client.receive_json()
    assert initial["type"] == "event" and not initial["event"]["enabled"]
    await editor_entry.runtime_data.async_set_enabled(True)
    changed = await client.receive_json()
    assert changed["event"]["enabled"]
    await client.send_json({"id": 2, "type": "unsubscribe_events", "subscription": 1})
    assert (await client.receive_json())["success"]
    await client.close()
    assert not devices


@pytest.mark.parametrize("fixture_name", ["gui-house.yaml", "scheduling-edge-cases.yaml"])
async def test_gui_and_yaml_validation_leave_the_loaded_preview_unchanged(
    hass, editor_entry, devices, hass_ws_client, fixture_name
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    engine = editor_entry.runtime_data
    before = engine.snapshot()
    path = Path(__file__).parents[1] / "fixtures" / "programs" / fixture_name
    source = await hass.async_add_executor_job(path.read_text)
    data = program_data(load_program(source))
    client = await hass_ws_client(hass)
    results = []
    for index, program in enumerate((source, data), 1):
        result = await request(
            client, "occupied/editor_validate", editor_entry, index * 2, program=program
        )
        assert result["result"]["valid"] and result["result"]["program"] == data
        preview = await request(
            client,
            "occupied/preview",
            editor_entry,
            index * 2 + 1,
            date="2026-10-06",
            days=7,
        )
        assert preview["result"]["valid"]
        assert preview["result"]["program"] == program_data(engine.program)
        results.append(preview["result"])
    assert results[0] == results[1]
    assert engine.snapshot() == before and not devices


@pytest.mark.parametrize(
    "command, extra",
    [
        ("occupied/program", {}),
        ("occupied/catalog", {}),
        ("occupied/timeline", {}),
        ("occupied/subscribe", {}),
        (
            "occupied/action_preview",
            {"action": {"action": "turn_on", "entities": ["light.proof"]}, "execute": True},
        ),
        ("occupied/editor_validate", {"program": {"schema_version": 1, "name": "House"}}),
        (
            "occupied/save",
            {"program": {"schema_version": 1, "name": "House"}, "expected_revision": "stale"},
        ),
    ],
)
async def test_all_editor_endpoints_require_admin(
    hass, entry, devices, hass_ws_client, hass_read_only_access_token, command, extra
):
    assert await hass.config_entries.async_setup(entry.entry_id)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    result = await request(client, command, entry, **extra)
    assert not result["success"] and result["error"]["code"] == "unauthorized"


async def test_catalog_discovers_time_entities_and_calendar_bounds(hass):
    from custom_components.occupied.editor import async_catalog
    from custom_components.occupied.time_sources import planning_context

    hass.states.async_set(
        "sensor.next_alarm",
        "2026-10-06T06:00:00+00:00",
        {"device_class": "timestamp", "friendly_name": "Phone alarm"},
    )
    hass.states.async_set("input_datetime.wake", "08:00:00", {"has_time": True, "has_date": False})
    hass.states.async_set(
        "input_datetime.dated",
        "2026-10-06 08:00:00",
        {"has_time": True, "has_date": True, "timestamp": 1791266400},
    )
    hass.states.async_set(
        "calendar.work",
        "off",
        {"start_time": "2026-10-06 09:00:00", "end_time": "2026-10-06 10:00:00"},
    )
    hass.states.async_set("sensor.temperature", "20", {"device_class": "temperature"})
    hass.states.async_set(
        "input_datetime.date_only", "2026-10-06", {"has_time": False, "has_date": True}
    )
    catalog = await async_catalog(hass)
    values = {option["value"] for option in catalog["time_sources"]}
    assert {
        "sun:dawn",
        "sun:dusk",
        "sun:noon",
        "sun:midnight",
        "entity:sensor.next_alarm",
        "entity:input_datetime.wake",
        "entity:calendar.work:start_time",
        "entity:calendar.work:end_time",
    } <= values
    assert "entity:sensor.temperature" not in values
    assert "entity:input_datetime.date_only" not in values
    context = planning_context(hass)
    assert context.time_sources["input_datetime.wake"]["kind"] == "time"
    assert context.time_sources["input_datetime.dated"]["state"].endswith("+00:00")
    assert context.time_sources["calendar.work"]["end_time"] == "2026-10-06 10:00:00"
    hass.states.async_set("calendar.work", "unavailable", {"start_time": "2026-10-06 09:00:00"})
    assert planning_context(hass).time_sources["calendar.work"]["start_time"] is None


async def test_yaml_editor_save_validates_before_persisting(
    hass, editor_entry, program_dict, devices, hass_ws_client
):
    import yaml

    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    client = await hass_ws_client(hass)
    before = program_document(editor_entry.runtime_data)
    invalid = await request(
        client,
        "occupied/save",
        editor_entry,
        program="name: [",
        expected_revision=before["revision"],
    )
    assert invalid["success"] and not invalid["result"]["valid"]
    assert invalid["result"]["issues"]
    assert program_document(editor_entry.runtime_data) == before
    code = yaml.safe_dump(program_dict | {"name": "Saved from YAML"})
    saved = await request(
        client,
        "occupied/save",
        editor_entry,
        2,
        program=code,
        expected_revision=before["revision"],
    )
    assert saved["success"] and saved["result"]["valid"]
    assert saved["result"]["program"]["name"] == "Saved from YAML"
    assert editor_entry.runtime_data.program.name == "Saved from YAML"
    assert not devices


ROOT = Path(__file__).resolve().parents[2]
BUILD_STEP = """
import { readFileSync } from 'node:fs';
import { buildStep, stepEditor, stepEntries } from
  './custom_components/occupied/frontend/dist/lib/models/step-model.js';
const { program, form, editing } = JSON.parse(readFileSync(0, 'utf8'));
const editor = stepEditor(program, editing ? stepEntries(program)[0] : null);
Object.assign(editor.form, form);
console.log(JSON.stringify({ id: editor.id, program: buildStep(program, editor) }));
"""


@pytest.mark.parametrize("editing", [False, True], ids=["add", "edit"])
@pytest.mark.parametrize(
    "form",
    [
        {
            "name": "Window on",
            "entities": ["light.a"],
            "kind": "entities",
            "timing": {"mode": "absolute", "start": "18:00:00", "end": "22:00:00"},
        },
        {"name": "", "entities": ["light.a", "switch.a"], "kind": "entities"},
        {"entities": ["light.a"], "kind": "entities", "action": "turn_off"},
        {"entities": ["light.a"], "kind": "entities", "days": ["mon", "wed"]},
        {
            "entities": ["light.a"],
            "kind": "entities",
            "timing": {
                "mode": "relative",
                "anchor": "sun:sunset",
                "startOffset": "-20m",
                "endOffset": "10m",
            },
        },
        {
            "entities": ["light.a"],
            "kind": "entities",
            "timing": {
                "mode": "relative",
                "anchor": "entity:calendar.work:start_time",
                "startOffset": "0s",
                "endOffset": "",
            },
        },
        {"entities": ["scene.evening"], "kind": "scene", "data": '{"transition": 5}'},
        {
            "entities": ["light.a"],
            "kind": "service",
            "service": "light.turn_on",
            "data": '{"brightness_pct": 55}',
        },
    ],
    ids=[
        "absolute-window",
        "untitled-mixed",
        "off",
        "parent-weekdays",
        "sun",
        "calendar",
        "scene",
        "service",
    ],
)
async def test_shipped_editor_add_and_edit_validate_save_and_reopen(
    hass, editor_entry, devices, hass_ws_client, form, editing
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    client = await hass_ws_client(hass)

    async def request(identifier, command, **data):
        await client.send_json(
            {
                "id": identifier,
                "type": f"occupied/{command}",
                "config_entry_id": editor_entry.entry_id,
                **data,
            }
        )
        response = await client.receive_json()
        assert response["success"], response
        return response["result"]

    document = await request(1, "program")
    built = await hass.async_add_executor_job(
        lambda: subprocess.run(
            ["node", "--input-type=module", "-e", BUILD_STEP],
            input=json.dumps({"program": document["program"], "form": form, "editing": editing}),
            capture_output=True,
            text=True,
            check=True,
            cwd=ROOT,
            timeout=15,
        )
    )
    candidate = json.loads(built.stdout)
    validation = await request(2, "editor_validate", program=candidate["program"])
    assert validation["valid"], validation
    assert program_document(editor_entry.runtime_data) == document
    saved = await request(
        3, "save", program=candidate["program"], expected_revision=document["revision"]
    )
    assert saved["valid"], saved
    reopened = await request(4, "program")
    assert reopened["program"] == validation["program"] == saved["program"]
    assert reopened["program"] == program_data(editor_entry.runtime_data.program)
    assert candidate["id"] in reopened["program"]["steps"]
    for step_id, step in document["program"]["steps"].items():
        if step_id != candidate["id"]:
            assert reopened["program"]["steps"][step_id] == step
    assert len(reopened["program"]["steps"]) == len(document["program"]["steps"]) + (not editing)
    assert not devices


async def test_custom_yaml_parse_save_and_export_preserve_actions(
    hass, editor_entry, devices, program_dict, hass_ws_client
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    client = await hass_ws_client(hass)
    text = """
- action: set_state
  entities:
    light.a:
      state: "on"
      brightness: 24
- action: cover.set_cover_position
  entities: [cover.blind]
  data: {position: 40}
"""
    parsed = (await request(client, "occupied/action_yaml", editor_entry, yaml=text))["result"]
    assert parsed["valid"]
    program_dict["steps"]["custom"] = {
        "timing": {"absolute_time": {"start": "20:00"}},
        **parsed,
    }
    program_dict["steps"]["custom"].pop("valid")
    document = (await request(client, "occupied/program", editor_entry, identifier=2))["result"]
    saved = (
        await request(
            client,
            "occupied/save",
            editor_entry,
            identifier=3,
            program=program_dict,
            expected_revision=document["revision"],
        )
    )["result"]
    assert saved["valid"]
    assert saved["program"]["steps"]["custom"]["actions"] == parsed["actions"]
    exported = (
        await request(
            client, "occupied/export", editor_entry, identifier=4, program=saved["program"]
        )
    )["result"]
    roundtrip = load_program(exported["yaml"])
    assert program_data(roundtrip)["steps"]["custom"]["actions"] == parsed["actions"]
    invalid = (
        await request(
            client,
            "occupied/action_yaml",
            editor_entry,
            identifier=5,
            yaml='action: set_state\nentities:\n  light.a: {state: "on", brightness_pct: 30}',
        )
    )["result"]
    assert not invalid["valid"] and invalid["issues"][0]["line"] == 3
    assert not devices


@pytest.mark.parametrize(
    ("service", "targets", "data", "code", "inner"),
    [
        ("turn_on", ["remote.tv"], {"activity": "TV"}, None, None),
        ("turn_on", ["remote.tv"], {"activty": "TV"}, "service_data", "remote.turn_on"),
        ("turn_on", ["remote.tv", "light.a"], {"activity": "TV"}, "service_data", "light.turn_on"),
        ("turn_off", ["remote.tv"], {"activty": "TV"}, "service_data", "remote.turn_off"),
        ("toggle", ["remote.tv"], {"activty": "TV"}, "service_data", "remote.toggle"),
        ("turn_on", ["sensor.room"], {}, "service_unsupported_entities", "sensor.room"),
        ("turn_on", ["homeassistant.room"], {}, None, None),
    ],
)
async def test_generic_turn_schema_checks_each_target_without_dispatch(
    hass, editor_entry, devices, program_dict, hass_ws_client, service, targets, data, code, inner
):
    from homeassistant.setup import async_setup_component

    assert await async_setup_component(hass, "homeassistant", {})
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    calls = []

    async def handle(call):
        calls.append(call)

    for name in ("turn_on", "turn_off", "toggle"):
        hass.services.async_register(
            "remote",
            name,
            handle,
            schema=vol.Schema(
                {vol.Required("entity_id"): cv.entity_ids, vol.Optional("activity"): str}
            ),
        )
    hass.services.async_register(
        "light",
        "turn_on",
        handle,
        schema=vol.Schema({vol.Required("entity_id"): cv.entity_ids}),
    )
    for entity in targets:
        hass.states.async_set(entity, "off")
    changed = deepcopy(program_dict)
    changed["steps"]["wake"].update(action=f"homeassistant.{service}", entities=targets, data=data)
    client = await hass_ws_client(hass)
    engine = editor_entry.runtime_data
    before = program_document(engine)
    validated = (await request(client, "occupied/editor_validate", editor_entry, program=changed))[
        "result"
    ]
    saved = (
        await request(
            client,
            "occupied/save",
            editor_entry,
            2,
            program=changed,
            expected_revision=before["revision"],
        )
    )["result"]
    assert validated["valid"] == saved["valid"] == (code != "service_data")
    if code == "service_data":
        assert validated["issues"] == saved["issues"]
    if code:
        issue = next(i for i in validated["issues"] if i["code"] == code)
        assert inner in issue["message"]
        assert issue["severity"] == ("error" if code == "service_data" else "warning")
        assert issue["model_path"] == [
            "steps",
            "wake",
            "data" if code == "service_data" else "entities",
        ]
    else:
        assert not validated["issues"]
    if code == "service_data":
        assert program_document(engine) == before
    assert not calls and not devices


@pytest.mark.parametrize(
    ("service", "activity", "state", "attributes", "warn"),
    [
        ("remote.turn_on", "TV", "off", {"activity_list": ["TV", "Wii"]}, False),
        ("remote.turn_on", "tv", "off", {"activity_list": ["TV", "Wii"]}, False),
        ("remote.turn_on", "Television", "off", {"activity_list": ["TV", "Wii"]}, True),
        ("remote.turn_on", "12345", "off", {"activity_list": ["TV", "Wii"]}, False),
        ("remote.turn_on", 12345, "off", {"activity_list": ["TV", "Wii"]}, False),
        ("remote.turn_on", "Television", "unavailable", {"activity_list": ["TV"]}, False),
        ("remote.turn_on", "Television", "off", {}, False),
        ("homeassistant.turn_on", "Television", "off", {"activity_list": ["TV"]}, True),
        ("homeassistant.toggle", "Television", "off", {"activity_list": ["TV"]}, True),
        ("remote.turn_off", "Television", "off", {"activity_list": ["TV"]}, False),
    ],
)
async def test_remote_activity_warning_is_advisory_and_never_calls_services(
    hass,
    editor_entry,
    devices,
    program_dict,
    hass_ws_client,
    service,
    activity,
    state,
    attributes,
    warn,
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    calls = []

    async def handle(call):
        calls.append(call)

    domain, name = service.split(".")
    hass.services.async_register(domain, name, handle)
    hass.states.async_set("remote.tv", state, attributes)
    changed = deepcopy(program_dict)
    changed["steps"]["wake"].update(
        action=service, entities=["remote.tv"], data={"activity": activity}
    )
    client = await hass_ws_client(hass)
    engine = editor_entry.runtime_data
    before = program_document(engine)
    validated = (await request(client, "occupied/editor_validate", editor_entry, program=changed))[
        "result"
    ]
    assert validated["valid"]
    issues = [i for i in validated["issues"] if i["code"] == "remote_activity_unknown"]
    assert bool(issues) == warn
    if warn:
        assert issues[0]["severity"] == "warning"
        assert issues[0]["model_path"] == ["steps", "wake", "data"]
        assert "remote.tv" in issues[0]["message"] and "TV" in issues[0]["message"]
    saved = (
        await request(
            client,
            "occupied/save",
            editor_entry,
            2,
            program=changed,
            expected_revision=before["revision"],
        )
    )["result"]
    assert saved["valid"]
    assert not calls and not devices


async def test_catalog_exposes_remote_activities(hass, editor_entry, devices, hass_ws_client):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    hass.states.async_set("remote.tv", "off", {"activity_list": ["TV", "Wii"]})
    client = await hass_ws_client(hass)
    result = (await request(client, "occupied/catalog", editor_entry))["result"]
    remote = next(e for e in result["entities"] if e["entity_id"] == "remote.tv")
    assert remote["activity_list"] == ["TV", "Wii"]
    assert not devices


async def test_action_preview_resolves_unsaved_commands_and_only_dispatches_when_requested(
    hass, editor_entry, devices, hass_ws_client, hass_storage
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    client = await hass_ws_client(hass)
    before = program_document(editor_entry.runtime_data)
    stored = deepcopy(hass_storage)
    source = {
        "actions": [
            {"action": "set_state", "entities": {"light.a": {"state": "on", "brightness": 128}}},
            {
                "action": "remote.turn_on",
                "entities": ["remote.harmony"],
                "data": {"activity": "TV"},
            },
        ]
    }
    preview = (await request(client, "occupied/action_preview", editor_entry, action=source))[
        "result"
    ]
    assert preview["valid"] and not preview["outcomes"] and not devices, preview
    assert preview["calls"] == [
        {"action": "light.turn_on", "data": {"entity_id": "light.a", "brightness": 128}},
        {"action": "remote.turn_on", "data": {"entity_id": "remote.harmony", "activity": "TV"}},
    ]
    tested = (
        await request(
            client, "occupied/action_preview", editor_entry, 2, action=source, execute=True
        )
    )["result"]
    assert tested["calls"] == preview["calls"]
    assert [outcome["status"] for outcome in tested["outcomes"]] == ["dispatched", "dispatched"]
    assert [(call.domain, call.service) for call in devices] == [
        ("light", "turn_on"),
        ("remote", "turn_on"),
    ]
    assert all(call.context.user_id for call in devices)
    assert program_document(editor_entry.runtime_data) == before
    assert hass_storage == stored


@pytest.mark.parametrize(
    "source",
    [
        {"action": "light.turn_on", "entities": []},
        {"action": "remote.missing", "entities": ["remote.harmony"]},
        {"action": "light.turn_on", "entities": ["light.unavailable"]},
    ],
)
async def test_invalid_action_preview_never_dispatches(
    hass, editor_entry, devices, hass_ws_client, source
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    client = await hass_ws_client(hass)
    result = (
        await request(client, "occupied/action_preview", editor_entry, action=source, execute=True)
    )["result"]
    assert not result["valid"] and result["issues"] and not devices


@pytest.mark.parametrize("timed_out", [False, True])
async def test_action_preview_stops_remaining_commands_after_failure(
    hass, editor_entry, devices, hass_ws_client, monkeypatch, timed_out
):
    from custom_components.occupied.actions import ServiceWaitTimeout

    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    client = await hass_ws_client(hass)
    dispatch = AsyncMock(
        side_effect=ServiceWaitTimeout("Still running") if timed_out else ValueError("Failed")
    )
    monkeypatch.setattr("custom_components.occupied.action_preview.dispatch_service", dispatch)
    source = {
        "actions": [
            {
                "action": "remote.turn_on",
                "entities": ["remote.harmony"],
                "data": {"activity": "TV"},
            },
            {"action": "remote.turn_off", "entities": ["remote.harmony"]},
        ]
    }
    result = (
        await request(client, "occupied/action_preview", editor_entry, action=source, execute=True)
    )["result"]
    assert result["valid"]
    assert [outcome["status"] for outcome in result["outcomes"]] == [
        "uncertain" if timed_out else "failed",
        "skipped",
    ]
    dispatch.assert_awaited_once()
    assert not devices
