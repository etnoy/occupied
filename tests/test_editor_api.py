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


async def test_random_actions_validate_save_preview_and_export(
    hass, editor_entry, devices, program_dict, hass_ws_client
):
    program_dict["random"] = {
        "lamp": {
            "start": {"relative_to": {"step": "wake"}},
            "end": {"relative_to": {"step": "leave"}},
            "min_duration": "1m",
            "max_duration": "5m",
            "count": 3,
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
    preview = (
        await request(
            client,
            "occupied/preview",
            editor_entry,
            2,
            program=result["program"],
            date="2026-10-06",
            days=1,
            seed="random-api",
        )
    )["result"]
    assert preview["valid"]
    assert (
        len(
            [
                event
                for event in preview["plans"][0]["events"]
                if event["kind"].startswith("random_")
            ]
        )
        == 6
    )
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
async def test_gui_export_and_yaml_source_normalize_and_preview_identically(
    hass, editor_entry, devices, hass_ws_client, fixture_name
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    engine = editor_entry.runtime_data
    before = engine.snapshot()
    path = Path(__file__).parent / "fixtures" / "programs" / fixture_name
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
            program=program,
            date="2026-10-06",
            days=7,
            seed="gui-file-equivalence",
        )
        assert preview["result"]["valid"]
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


ROOT = Path(__file__).resolve().parents[1]
BUILD_STEP = """
import { readFileSync } from 'node:fs';
import { buildStep, stepEditor, stepEntries } from
  './custom_components/occupied/frontend/dist/step-model.js';
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
            "name": "Agnes fönster on",
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
