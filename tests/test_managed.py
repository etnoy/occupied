"""Managed-file acceptance through real HA setup, storage, timers, APIs and repairs."""

import json
from copy import deepcopy
from datetime import timedelta
from unittest.mock import AsyncMock

import pytest
import yaml
from homeassistant.core import CoreState
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

from custom_components.occupied.diagnostics import diagnostics_data
from custom_components.occupied.file_config import MAX_FILE_BYTES, read_managed
from custom_components.occupied.validation import ProgramError, program_revision


@pytest.fixture(autouse=True)
def managed_clock(freezer):
    freezer.move_to("2026-10-06T18:00:00+00:00")


@pytest.fixture
def managed_file(hass, tmp_path, program_dict):
    hass.config.config_dir = str(tmp_path)
    path = tmp_path / "occupied" / "house.yaml"
    path.parent.mkdir()
    path.write_text(yaml.safe_dump(program_dict))
    return path


@pytest.fixture
def file_entry(hass, managed_file):
    entry = MockConfigEntry(
        domain="occupied",
        unique_id="occupied",
        title="House",
        data={"source": "file", "name": "House", "config_file": "occupied/house.yaml"},
    )
    entry.add_to_hass(hass)
    hass.set_state(CoreState.running)
    return entry


async def load(hass, entry):
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry.runtime_data


async def request(client, entry, kind, identifier=1, **data):
    await client.send_json(
        {"id": identifier, "type": f"occupied/{kind}", "config_entry_id": entry.entry_id, **data}
    )
    return await client.receive_json()


async def advance(hass, freezer, seconds):
    freezer.move_to(dt_util.utcnow() + timedelta(seconds=seconds))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done(wait_background_tasks=True)


async def test_read_only_install_and_idempotent_reload(hass, file_entry, managed_file, devices):
    managed_file.chmod(0o444)
    original = managed_file.read_bytes()
    engine = await load(hass, file_entry)
    assert engine.configuration_ready and not engine.enabled
    await engine.async_set_dry_run(True)
    await engine.async_set_enabled(True)
    plans, queue, generation = dict(engine._plans), list(engine._queue), engine.generation
    result = await engine.source_manager.async_reload()
    assert result["valid"] and not result["changed"]
    assert engine._plans == plans and engine._queue == queue and engine.generation == generation
    assert managed_file.read_bytes() == original and not devices
    assert engine.source_manager.applied_hash == engine.source_manager.observed_hash


async def test_raw_only_and_metadata_changes_preserve_plans(
    hass, file_entry, managed_file, program_dict
):
    engine = await load(hass, file_entry)
    await engine.async_set_dry_run(True)
    await engine.async_set_enabled(True)
    manager = engine.source_manager
    old_hash, plans, generation, deadline = (
        manager.applied_hash,
        dict(engine._plans),
        engine.generation,
        engine.handover_deadline,
    )
    managed_file.write_text(managed_file.read_text() + "\n# Puppet rendering changed\n")
    result = await manager.async_reload()
    assert result["valid"] and not result["changed"] and manager.applied_hash != old_hash
    changed = deepcopy(program_dict)
    changed["groups"][0]["name"] = "New label"
    managed_file.write_text(yaml.safe_dump(changed))
    assert (await manager.async_reload())["changed"]
    assert engine.program.groups[0].name == "New label"
    assert engine._plans == plans and engine.generation == generation
    assert engine.handover_deadline == deadline


@pytest.mark.parametrize("failure", ["yaml", "deep_yaml", "schema", "missing", "infeasible"])
async def test_invalid_update_retains_live_program_then_recovers(
    hass, file_entry, managed_file, program_dict, failure
):
    engine = await load(hass, file_entry)
    await engine.async_set_dry_run(True)
    await engine.async_set_enabled(True)
    program, plans, queue, generation = (
        engine.program,
        dict(engine._plans),
        list(engine._queue),
        engine.generation,
    )
    if failure == "missing":
        managed_file.unlink()
    elif failure == "yaml":
        managed_file.write_text("name: [\n")
    elif failure == "deep_yaml":
        managed_file.write_text("name: " + "[" * 600 + "value" + "]" * 600)
    elif failure == "schema":
        managed_file.write_text("schema_version: 99\nname: Invalid\n")
    else:
        bad = deepcopy(program_dict)
        bad["routines"][0]["activity_windows"][0]["on_duration"] = {"fixed": "5h"}
        managed_file.write_text(yaml.safe_dump(bad))
    result = await engine.source_manager.async_reload()
    assert not result["valid"] and result["status"] == "error"
    assert engine.program is program and engine._plans == plans and engine._queue == queue
    assert engine.generation == generation and engine.configuration_ready
    registry = ir.async_get(hass)
    assert ("occupied", f"managed_file_{file_entry.entry_id}") in registry.issues
    managed_file.write_text(yaml.safe_dump(program_dict | {"name": "Recovered"}))
    result = await engine.source_manager.async_reload()
    assert result["valid"] and engine.program.name == "Recovered"
    assert ("occupied", f"managed_file_{file_entry.entry_id}") not in registry.issues


async def test_invalid_initial_file_never_uses_gui_cache(
    hass, file_entry, managed_file, hass_storage, program_dict, devices
):
    managed_file.write_text("name: [\n")
    hass_storage[f"occupied.{file_entry.entry_id}.program"] = {"version": 1, "data": program_dict}
    hass_storage[f"occupied.{file_entry.entry_id}.permission"] = {
        "version": 1,
        "data": {"enabled": True},
    }
    engine = await load(hass, file_entry)
    assert engine.enabled and not engine.active and not engine.configuration_ready
    assert engine.status == "waiting" and not engine.program.routines and not devices
    managed_file.write_text(yaml.safe_dump(program_dict))
    assert (await engine.source_manager.async_reload())["valid"]
    assert engine.configuration_ready and engine.program.routines


async def test_debounced_atomic_rename_and_unload_cleanup(
    hass, file_entry, managed_file, program_dict, freezer
):
    engine = await load(hass, file_entry)
    manager = engine.source_manager
    await advance(hass, freezer, 5)
    await advance(hass, freezer, 1)
    replacement = managed_file.with_suffix(".candidate")
    replacement.write_text(yaml.safe_dump(program_dict | {"name": "Atomic replacement"}))
    replacement.replace(managed_file)
    await advance(hass, freezer, 5)
    assert engine.program.name == "House"
    await advance(hass, freezer, 1)
    assert engine.program.name == "Atomic replacement"
    await hass.config_entries.async_unload(file_entry.entry_id)
    assert manager.closed and manager._unsubscribe is None and manager._debounce is None
    managed_file.write_text("name: [\n")
    await advance(hass, freezer, 10)
    assert engine.program.name == "Atomic replacement"


async def test_file_api_read_only_and_explicit_gui_copy_survives_restart(
    hass, file_entry, managed_file, program_dict, hass_ws_client
):
    engine = await load(hass, file_entry)
    original = managed_file.read_bytes()
    client = await hass_ws_client(hass)
    doc = (await request(client, file_entry, "program"))["result"]
    assert doc["source"] == "file" and doc["configuration_source"]["read_only"]
    for identifier, kind in ((2, "save"), (3, "apply")):
        response = await request(
            client,
            file_entry,
            kind,
            identifier,
            program=program_dict | {"name": "Attempt"},
            expected_revision=doc["revision"],
        )
        assert not response["success"] and "authoritative" in response["error"]["message"]
    response = await request(
        client, file_entry, "source", 4, source="gui", expected_revision=doc["revision"]
    )
    assert response["success"] and response["result"]["source"] == "gui"
    await hass.async_block_till_done()
    assert file_entry.runtime_data is engine and file_entry.data["source"] == "gui"
    managed_file.write_text("name: [\n")
    assert await hass.config_entries.async_reload(file_entry.entry_id)
    assert (
        file_entry.runtime_data.configuration_ready
        and file_entry.runtime_data.program.name == "House"
    )
    managed_file.write_bytes(original)


async def test_invalid_source_switch_and_stale_revision_leave_source_intact(
    hass, file_entry, managed_file, hass_ws_client
):
    engine = await load(hass, file_entry)
    client = await hass_ws_client(hass)
    revision = program_revision(engine.program)
    response = await request(
        client,
        file_entry,
        "source",
        source="file",
        config_file="occupied/missing.yaml",
        expected_revision=revision,
    )
    assert response["success"] and not response["result"]["valid"]
    assert engine.source_manager.path == "occupied/house.yaml"
    response = await request(
        client, file_entry, "source", 2, source="gui", expected_revision="stale"
    )
    assert response["error"]["code"] == "revision_conflict" and engine.source_manager.mode == "file"


async def test_reload_service_and_websocket_errors_are_actionable(
    hass, file_entry, managed_file, hass_ws_client
):
    engine = await load(hass, file_entry)
    result = await hass.services.async_call(
        "occupied",
        "reload",
        {"config_entry_id": file_entry.entry_id},
        blocking=True,
        return_response=True,
    )
    assert result["valid"] and not result["changed"]
    managed_file.write_text("name: [\n")
    with pytest.raises(HomeAssistantError, match="validation failed"):
        await hass.services.async_call(
            "occupied", "reload", {"config_entry_id": file_entry.entry_id}, blocking=True
        )
    client = await hass_ws_client(hass)
    response = await request(client, file_entry, "reload")
    assert response["success"] and not response["result"]["valid"]
    assert engine.configuration_ready


async def test_gui_to_file_keeps_engine_and_equivalent_behavior(hass, managed_file, program_dict):
    entry = MockConfigEntry(
        domain="occupied", unique_id="occupied", data={"name": "House", "program": program_dict}
    )
    entry.add_to_hass(hass)
    engine = await load(hass, entry)
    generation = engine.generation
    await engine.source_manager.async_select(
        "file", "occupied/house.yaml", program_revision(engine.program)
    )
    await hass.async_block_till_done()
    assert entry.runtime_data is engine and engine.generation == generation
    assert entry.data["source"] == "file" and engine.source_manager.mode == "file"
    assert await hass.config_entries.async_reload(entry.entry_id)
    assert entry.runtime_data.source_manager.mode == "file"


async def test_bootstrap_clean_install_is_singleton(hass, managed_file):
    assert await async_setup_component(
        hass, "occupied", {"occupied": {"config_file": "occupied/house.yaml"}}
    )
    await hass.async_block_till_done()
    entries = hass.config_entries.async_entries("occupied")
    assert len(entries) == 1 and entries[0].data["source"] == "file"
    result = await hass.config_entries.flow.async_init(
        "occupied", context={"source": "import"}, data={"config_file": "occupied/different.yaml"}
    )
    assert result["type"] == FlowResultType.ABORT
    assert entries[0].data["config_file"] == "occupied/house.yaml"


@pytest.mark.parametrize("source", ["gui", "file"])
async def test_bootstrap_conflict_does_not_override_entry(hass, managed_file, program_dict, source):
    entry = MockConfigEntry(
        domain="occupied",
        unique_id="occupied",
        data={
            "name": "Existing",
            "program": program_dict,
            "source": source,
            **({"config_file": "occupied/existing.yaml"} if source == "file" else {}),
        },
    )
    entry.add_to_hass(hass)
    assert await async_setup_component(
        hass, "occupied", {"occupied": {"config_file": "occupied/house.yaml"}}
    )
    await hass.async_block_till_done()
    assert entry.data["name"] == "Existing" and entry.data["source"] == source
    assert ("occupied", "source_conflict") in ir.async_get(hass).issues


async def test_native_file_flow_missing_then_valid(hass, managed_file):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"name": "House", "method": "file"}
    )
    assert result["step_id"] == "file"
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"config_file": "missing.yaml"}
    )
    assert result["errors"] == {"config_file": "invalid_file"}
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"config_file": "occupied/house.yaml"}
    )
    assert result["type"] == FlowResultType.CREATE_ENTRY and result["data"]["source"] == "file"


@pytest.mark.parametrize("relative", ["../outside.yaml", "/tmp/house.yaml", "", ".", "bad\x00path"])
def test_managed_path_must_stay_under_config(tmp_path, relative):
    with pytest.raises(ProgramError):
        read_managed(str(tmp_path), relative)


def test_symlink_escape_and_size_bounds(tmp_path):
    (tmp_path / "escape.yaml").symlink_to(tmp_path.parent / "outside.yaml")
    with pytest.raises(ProgramError, match="under"):
        read_managed(str(tmp_path), "escape.yaml")
    (tmp_path / "huge.yaml").write_bytes(b"a" * (MAX_FILE_BYTES + 1))
    with pytest.raises(ProgramError, match="1 MiB"):
        read_managed(str(tmp_path), "huge.yaml")


def test_symlink_loop_is_a_validation_error(tmp_path):
    (tmp_path / "loop.yaml").symlink_to("loop.yaml")
    with pytest.raises(ProgramError, match="resolve"):
        read_managed(str(tmp_path), "loop.yaml")


async def test_default_diagnostics_do_not_expose_source_path_or_yaml(
    hass, file_entry, managed_file
):
    managed_file.write_text("secret_house_name: [\n")
    engine = await load(hass, file_entry)
    output = json.dumps(diagnostics_data(engine))
    assert "secret_house_name" not in output and "house.yaml" not in output
    assert "error" in output and diagnostics_data(engine)["counts"]["source_issues"] == 1


async def test_gui_copy_storage_failure_retains_file_authority(hass, file_entry, monkeypatch):
    engine = await load(hass, file_entry)
    monkeypatch.setattr(
        "custom_components.occupied.engine_daily.program_store",
        lambda *_args: type(
            "Failed", (), {"async_save": AsyncMock(side_effect=HomeAssistantError("Disk full"))}
        )(),
    )
    with pytest.raises(HomeAssistantError, match="Disk full"):
        await engine.source_manager.async_select("gui", None, program_revision(engine.program))
    assert engine.source_manager.mode == "file" and file_entry.data["source"] == "file"


async def test_entry_removal_deletes_private_stores_and_retains_managed_source(
    hass, file_entry, managed_file, hass_storage
):
    engine = await load(hass, file_entry)
    await engine.async_set_dry_run(True)
    await engine.async_set_enabled(True)
    original = managed_file.read_bytes()
    assert await hass.config_entries.async_remove(file_entry.entry_id)
    await hass.async_block_till_done()
    assert engine.closed and engine.source_manager.closed
    assert managed_file.read_bytes() == original
    for suffix in ("program", "permission", "runtime"):
        assert f"occupied.{file_entry.entry_id}.{suffix}" not in hass_storage


async def test_rest_reload_response_and_admin_authorization(
    hass, file_entry, managed_file, hass_client, hass_read_only_access_token
):
    await load(hass, file_entry)
    client = await hass_client()
    response = await client.post(
        "/api/services/occupied/reload?return_response",
        json={"config_entry_id": file_entry.entry_id},
    )
    assert response.status == 200
    result = await response.json()
    assert result["service_response"]["valid"]
    managed_file.write_text("name: [\n")
    response = await client.post(
        "/api/services/occupied/reload?return_response",
        json={"config_entry_id": file_entry.entry_id},
    )
    assert response.status == 200 and not (await response.json())["service_response"]["valid"]
    read_only = await hass_client(access_token=hass_read_only_access_token)
    response = await read_only.post(
        "/api/services/occupied/reload?return_response",
        json={"config_entry_id": file_entry.entry_id},
    )
    assert response.status == 401
