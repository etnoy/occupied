"""Authoritative program renames keep HA entry labels and uniqueness in sync."""

import pytest
import yaml
from homeassistant.core import CoreState
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.occupied.editor import program_document


@pytest.fixture(autouse=True)
def name_clock(freezer):
    freezer.move_to("2026-10-13T18:03:00+00:00")


async def save(client, entry, identifier, program, revision):
    await client.send_json(
        {
            "id": identifier,
            "type": "occupied/save",
            "config_entry_id": entry.entry_id,
            "program": program,
            "expected_revision": revision,
        }
    )
    return await client.receive_json()


@pytest.mark.parametrize("daily", [True, False], ids=["gui", "proof-conversion"])
async def test_saved_name_updates_entry_without_reloading_daily_engine(
    hass, hass_ws_client, config, devices, daily
):
    program = {"schema_version": 1, "name": "Original"}
    entry = MockConfigEntry(
        domain="occupied",
        unique_id="rename",
        title="Original",
        data={"name": "Original", "program": program} if daily else config | {"name": "Original"},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    engine = entry.runtime_data
    revision = program_document(engine)["revision"]
    client = await hass_ws_client(hass)
    invalid = await save(
        client, entry, 1, {"schema_version": 1, "name": "Rejected", "steps": {"bad": {}}}, revision
    )
    assert not invalid["result"]["valid"]
    assert entry.title == entry.data["name"] == "Original"
    result = await save(client, entry, 2, program | {"name": "Renamed"}, revision)
    assert result["result"]["valid"]
    await hass.async_block_till_done()
    assert entry.title == entry.data["name"] == "Renamed"
    if daily:
        assert entry.runtime_data is engine and not engine.closed
    else:
        assert engine.closed and entry.runtime_data.program.name == "Renamed"
    assert not devices

    flow = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    flow = await hass.config_entries.flow.async_configure(
        flow["flow_id"], {"next_step_id": "create"}
    )
    result = await hass.config_entries.flow.async_configure(
        flow["flow_id"], user_input={"name": "Renamed"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"name": "name_already_exists"}
    result = await hass.config_entries.flow.async_configure(
        flow["flow_id"], user_input={"name": "Original"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()


async def test_managed_reload_syncs_name_and_invalid_files_preserve_it(hass, tmp_path):
    hass.config.config_dir = str(tmp_path)
    hass.set_state(CoreState.running)
    path = tmp_path / "occupied" / "house.yaml"
    path.parent.mkdir()
    path.write_text("schema_version: 1\nname: Original\n", encoding="utf-8")
    entry = MockConfigEntry(
        domain="occupied",
        unique_id="managed-rename",
        title="Original",
        data={"source": "file", "name": "Original", "config_file": "occupied/house.yaml"},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    engine = entry.runtime_data
    path.write_text(yaml.safe_dump({"schema_version": 1, "name": "Renamed"}), encoding="utf-8")
    assert (await engine.source_manager.async_reload())["valid"]
    await hass.async_block_till_done()
    assert entry.title == entry.data["name"] == "Renamed"
    assert entry.data["source"] == "file" and entry.data["config_file"] == "occupied/house.yaml"
    assert entry.runtime_data is engine and not engine.closed

    hass.config_entries.async_update_entry(
        entry, title="Stale", data={**entry.data, "name": "Stale"}
    )
    unchanged = await engine.source_manager.async_reload()
    assert unchanged["valid"] and not unchanged["changed"]
    assert entry.title == entry.data["name"] == "Renamed"
    path.write_text("schema_version: wrong\nname: Rejected\n", encoding="utf-8")
    assert not (await engine.source_manager.async_reload())["valid"]
    assert entry.title == entry.data["name"] == "Renamed"
    assert entry.runtime_data is engine and not engine.closed
