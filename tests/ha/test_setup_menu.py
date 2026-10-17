"""Exercise native menu selection rather than injecting hidden setup methods."""

import json

import pytest
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def select(hass, method):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    assert result["type"] is FlowResultType.MENU
    assert result["menu_options"] == ["create", "yaml", "file"]
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": method}
    )
    assert result["type"] is FlowResultType.FORM and result["step_id"] == method
    return result


@pytest.mark.parametrize("method", ["create", "yaml", "file"])
async def test_all_setup_paths_reject_existing_names(hass, tmp_path, method):
    hass.config.config_dir = str(tmp_path)
    MockConfigEntry(domain="occupied", title="Existing", data={"name": "Existing"}).add_to_hass(
        hass
    )
    program = {"schema_version": 1, "name": "existing"}
    (tmp_path / "program.yaml").write_text(json.dumps(program))
    flow = await select(hass, method)
    user_input = {
        "create": {"name": " Existing "},
        "yaml": {"program": json.dumps(program)},
        "file": {"config_file": "program.yaml"},
    }[method]
    result = await hass.config_entries.flow.async_configure(flow["flow_id"], user_input)
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"name" if method == "create" else "base": "name_already_exists"}
    assert len(hass.config_entries.async_entries("occupied")) == 1


@pytest.mark.parametrize("alias", [False, True])
async def test_managed_path_cannot_be_claimed_twice(hass, tmp_path, alias):
    hass.config.config_dir = str(tmp_path)
    path = tmp_path / "program.yaml"
    path.write_text(json.dumps({"schema_version": 1, "name": "New name in file"}))
    MockConfigEntry(
        domain="occupied",
        title="Original name",
        data={"name": "Original name", "source": "file", "config_file": "program.yaml"},
    ).add_to_hass(hass)
    if alias:
        (tmp_path / "alias.yaml").symlink_to(path)
    flow = await select(hass, "file")
    result = await hass.config_entries.flow.async_configure(
        flow["flow_id"], {"config_file": "alias.yaml" if alias else "program.yaml"}
    )
    assert result["errors"] == {"config_file": "file_already_managed"}
    assert len(hass.config_entries.async_entries("occupied")) == 1
