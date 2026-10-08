"""Editor revision isolation, native-schema validation and actual runtime streams."""

from copy import deepcopy
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
import voluptuous as vol
from homeassistant.components import light, remote
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

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
    assert doc["program"]["activation"]["conditions"][0]["state"] == ["armed", "armed_away"]
    assert doc["program"]["routines"][0]["activities"][0]["duration"] == {"fixed": "45m"}
    catalog = (await request(client, "occupied/catalog", entry, 2))["result"]
    assert any(e["entity_id"] == "light.proof" and e["dimmable"] for e in catalog["entities"])
    assert "turn_on" in catalog["services"]["light"]
    assert entry.runtime_data is engine and engine.snapshot() == before and not devices


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
    changed["groups"][0]["name"] = "Renamed room"
    changed["routines"][0]["name"] = "Renamed routine"
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
    changed["routines"][0]["steps"][0]["actions"] = [
        {
            "action": "script.turn_on",
            "targets": {"entities": ["script.custom"]},
            "data": {"not_a_field": True},
        }
    ]
    client = await hass_ws_client(hass)
    doc = program_document(editor_entry.runtime_data)
    validation = await request(client, "occupied/editor_validate", editor_entry, program=changed)
    assert not validation["result"]["valid"]
    issue = next(i for i in validation["result"]["issues"] if i["code"] == "service_data")
    assert issue["model_path"] == ["routines", 0, "steps", 0, "actions", 0, "data"]
    saved = await request(
        client, "occupied/save", editor_entry, 2, program=changed, expected_revision=doc["revision"]
    )
    assert not saved["result"]["valid"] and program_document(editor_entry.runtime_data) == doc
    assert not calls and not devices


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
    assert any(
        e["kind"] == "activity_start" and e["outcome"] == "scheduled" for e in result["events"]
    )
    assert engine.snapshot() == before and not devices


async def test_timeline_distinguishes_nominal_end_from_immutable_runtime_deadline(
    hass, editor_entry, devices, program_dict, hass_ws_client, freezer
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    engine = editor_entry.runtime_data
    changed = deepcopy(program_dict)
    changed["routines"][0]["activities"][0]["when"] = {
        "clock_range": {"earliest": "18:01", "latest": "18:01"}
    }
    await engine.async_replace_program(validate_program(changed))
    await engine.async_set_enabled(True)
    freezer.move_to("2026-10-06T18:01:05+00:00")
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    client = await hass_ws_client(hass)
    result = (await request(client, "occupied/timeline", editor_entry))["result"]
    ending = next(event for event in result["events"] if event["kind"] == "activity_end")
    assert ending["time"] == "2026-10-06T18:46:00+00:00"
    assert ending["actual_time"] == "2026-10-06T18:46:05+00:00"
    assert result["snapshot"]["activities"][0]["deadline"] == ending["actual_time"]


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


async def test_gui_export_and_yaml_source_normalize_and_preview_identically(
    hass, editor_entry, devices, hass_ws_client
):
    assert await hass.config_entries.async_setup(editor_entry.entry_id)
    engine = editor_entry.runtime_data
    before = engine.snapshot()
    source = await hass.async_add_executor_job(Path("examples/gui-house.yaml").read_text)
    data = program_data(load_program(source))
    assert data["routines"][0]["steps"][1]["when"]["relative_to"] == "wake_up"
    assert data["activation"]["conditions"][0]["state"] == ["armed", "armed away", "armed_away"]
    assert data["routines"][2]["activities"][0]["duration"] == {"fixed": "45m"}
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
