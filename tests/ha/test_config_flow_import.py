"""Bootstrap imports accept managed-file declarations, not program documents."""

import pytest
from homeassistant.data_entry_flow import FlowResultType


async def test_bootstrap_import_rejects_a_program_document(hass, program_dict):
    result = await hass.config_entries.flow.async_init(
        "occupied", context={"source": "import"}, data=program_dict
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "invalid_program"
    assert not hass.config_entries.async_entries("occupied")


@pytest.mark.parametrize("alias", [False, True])
async def test_named_bootstrap_cannot_duplicate_existing_managed_path(hass, tmp_path, alias):
    from homeassistant.helpers import issue_registry as ir
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    hass.config.config_dir = str(tmp_path)
    directory = tmp_path / "occupied"
    directory.mkdir()
    (directory / "house.yaml").write_text("schema_version: 1\nname: House\n")
    if alias:
        (directory / "alias.yaml").symlink_to(directory / "house.yaml")
    owner = MockConfigEntry(
        domain="occupied",
        unique_id="ui-created",
        title="House",
        data={"source": "file", "name": "House", "config_file": "occupied/house.yaml"},
    )
    owner.add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        "occupied",
        context={"source": "import"},
        data={
            "id": "house",
            "config_file": "occupied/alias.yaml" if alias else "occupied/./house.yaml",
        },
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "file_already_managed"
    assert hass.config_entries.async_entries("occupied") == [owner]
    assert owner.unique_id == "ui-created"
    assert any(
        key[0] == "occupied" and key[1].startswith("duplicate_managed_file_")
        for key in ir.async_get(hass).issues
    )
