"""Invalid GUI data stays editable without enabling automatic device actions."""

from copy import deepcopy

import pytest
import yaml
from homeassistant.config_entries import ConfigEntryState
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.occupied.editor import program_document
from custom_components.occupied.storage import program_store
from custom_components.occupied.validation import program_data, validate_program


async def load_invalid(hass, hass_storage, source, origin):
    data = {"source": "gui", "name": "Recovery controller"}
    if origin == "entry":
        data["program"] = deepcopy(source)
    else:
        data["program"] = {"schema_version": 1, "name": "Older fallback"}
    entry = MockConfigEntry(domain="occupied", title="Recovery controller", data=data)
    entry.add_to_hass(hass)
    if origin == "store":
        hass_storage[f"occupied.{entry.entry_id}.program"] = {
            "version": 1,
            "data": deepcopy(source),
        }
    hass_storage[f"occupied.{entry.entry_id}.permission"] = {
        "version": 1,
        "data": {"enabled": True},
    }
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


@pytest.mark.parametrize(
    ("origin", "source"),
    [
        ("store", {"schema_version": 99, "name": "Old program"}),
        ("store", {}),
        ("store", 0),
        ("entry", {"schema_version": 99, "name": "Old program"}),
        ("entry", None),
    ],
)
async def test_invalid_gui_program_can_be_repaired_without_losing_source(
    hass, hass_storage, hass_ws_client, devices, origin, source
):
    entry = await load_invalid(hass, hass_storage, source, origin)
    engine = entry.runtime_data
    assert entry.state is ConfigEntryState.LOADED
    assert engine.enabled and not engine.configuration_ready and not engine.active
    assert engine.status == "error" and not engine.program.steps and not devices
    assert "occupied" in hass.data["frontend_panels"]
    issue_id = ("occupied", f"invalid_program_{entry.entry_id}")
    assert issue_id in ir.async_get(hass).issues
    document = program_document(engine)
    assert yaml.safe_load(document["recovery_yaml"]) == source
    assert document["revision"].startswith("invalid:")
    assert engine.snapshot()["source_revision"] == document["revision"]
    assert document["configuration_source"]["status"] == "error"
    original_store = deepcopy(await program_store(hass, entry.entry_id).async_load())
    assert original_store == (source if origin == "store" else None)
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/save",
            "config_entry_id": entry.entry_id,
            "program": {"schema_version": 99, "name": "Still invalid"},
            "expected_revision": document["revision"],
        }
    )
    rejected = await client.receive_json()
    assert rejected["success"] and not rejected["result"]["valid"]
    assert not engine.configuration_ready and issue_id in ir.async_get(hass).issues
    assert (await program_store(hass, entry.entry_id).async_load()) == original_store
    assert entry.data.get("program") == (
        source if origin == "entry" else {"schema_version": 1, "name": "Older fallback"}
    )
    corrected = {"schema_version": 1, "name": "Recovery controller"}
    await client.send_json(
        {
            "id": 2,
            "type": "occupied/save",
            "config_entry_id": entry.entry_id,
            "program": yaml.safe_dump(corrected),
            "expected_revision": document["revision"],
        }
    )
    saved = await client.receive_json()
    assert saved["success"] and saved["result"]["valid"]
    assert saved["result"]["recovery_yaml"] is None
    assert engine.configuration_ready and engine.status != "error"
    assert issue_id not in ir.async_get(hass).issues
    assert not devices
    assert (await program_store(hass, entry.entry_id).async_load()) == program_data(
        validate_program(corrected)
    )
    # A stale recovery editor must conflict even when the valid save matches the placeholder.
    await client.send_json(
        {
            "id": 3,
            "type": "occupied/save",
            "config_entry_id": entry.entry_id,
            "program": corrected,
            "expected_revision": document["revision"],
        }
    )
    assert (await client.receive_json())["error"]["code"] == "revision_conflict"
    assert await hass.config_entries.async_reload(entry.entry_id)
    assert entry.runtime_data.configuration_ready
    assert program_document(entry.runtime_data)["recovery_yaml"] is None
    assert issue_id not in ir.async_get(hass).issues


async def test_removing_an_unresolved_controller_removes_its_repair(hass, hass_storage):
    entry = await load_invalid(hass, hass_storage, {}, "store")
    issue_id = ("occupied", f"invalid_program_{entry.entry_id}")
    assert issue_id in ir.async_get(hass).issues
    assert await hass.config_entries.async_remove(entry.entry_id)
    assert issue_id not in ir.async_get(hass).issues


@pytest.mark.parametrize("command", ["save", "apply"])
@pytest.mark.parametrize("discard", [False, True])
async def test_gui_save_cannot_overwrite_preserved_recovery_without_explicit_discard(
    hass, hass_storage, hass_ws_client, command, discard
):
    source = {
        "schema_version": 99,
        "name": "Preserve me",
        "steps": {"original": {"future": "data"}},
    }
    entry = await load_invalid(hass, hass_storage, source, "store")
    document = program_document(entry.runtime_data)
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": f"occupied/{command}",
            "config_entry_id": entry.entry_id,
            "program": document["program"],
            "expected_revision": document["revision"],
            **({"discard_recovery": True} if discard else {}),
        }
    )
    response = await client.receive_json()
    saved = await program_store(hass, entry.entry_id).async_load()
    if discard:
        assert response["success"] and response["result"]["valid"]
        assert response["result"]["recovery_yaml"] is None
        assert saved == document["program"]
        assert entry.runtime_data.configuration_ready
    else:
        assert not response["success"]
        assert response["error"]["translation_key"] == "preserved_program_requires_repair"
        assert saved == source
        assert not entry.runtime_data.configuration_ready
        assert yaml.safe_load(program_document(entry.runtime_data)["recovery_yaml"]) == source


@pytest.mark.parametrize("valid", [False, True])
async def test_recovery_can_select_managed_file_using_advertised_revision(
    hass, hass_storage, hass_ws_client, tmp_path, valid
):
    hass.config.config_dir = str(tmp_path)
    directory = tmp_path / "occupied"
    directory.mkdir()
    path = directory / "recovered.yaml"
    candidate = {"schema_version": 1 if valid else 99, "name": "Recovered file"}
    path.write_text(yaml.safe_dump(candidate))
    preserved = {"schema_version": 99, "name": "Preserved"}
    entry = await load_invalid(hass, hass_storage, preserved, "store")
    document = program_document(entry.runtime_data)
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/source",
            "config_entry_id": entry.entry_id,
            "source": "file",
            "config_file": "occupied/recovered.yaml",
            "expected_revision": document["revision"],
        }
    )
    response = await client.receive_json()
    assert response["success"]
    assert response["result"]["valid"] is valid
    if valid:
        assert response["result"]["source"] == "file"
        assert response["result"]["program"]["name"] == "Recovered file"
        assert response["result"]["recovery_yaml"] is None
        assert entry.runtime_data.configuration_ready
    else:
        assert program_document(entry.runtime_data)["revision"] == document["revision"]
        assert entry.runtime_data.source_manager.mode == "gui"
    assert (await program_store(hass, entry.entry_id).async_load()) == preserved
    await client.send_json(
        {
            "id": 2,
            "type": "occupied/source",
            "config_entry_id": entry.entry_id,
            "source": "file",
            "config_file": "occupied/recovered.yaml",
            "expected_revision": "invalid:stale",
        }
    )
    assert (await client.receive_json())["error"]["code"] == "revision_conflict"
