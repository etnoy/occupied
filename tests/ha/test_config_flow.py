"""Real HA config/options flows for independent controllers."""

import pytest
from homeassistant.data_entry_flow import FlowResultType, InvalidData


async def test_config_flow_allows_another_independent_entry(hass, config, devices):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "proof"})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], user_input=config)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "House"
    await hass.async_block_till_done()
    assert len(hass.config_entries.async_entries("occupied")) == 1
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "Occupied"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Occupied"
    await hass.async_block_till_done()
    entries = hass.config_entries.async_entries("occupied")
    assert len(entries) == 2
    assert entries[0].unique_id != entries[1].unique_id
    assert entries[0].runtime_data is not entries[1].runtime_data


@pytest.mark.parametrize(
    "invalid",
    [
        {"allowed_states": []},
        {"remote_activity": " "},
    ],
)
async def test_invalid_config_is_actionable(hass, config, invalid):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "proof"})
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input=config | invalid
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_config"}


@pytest.mark.parametrize(
    "invalid",
    [
        {"light_entity": "switch.unsupported"},
        {"remote_entity": "light.unsupported"},
        {"handover_seconds": -1},
        {"remote_duration_seconds": 0},
    ],
)
async def test_native_schema_errors_identify_the_field(hass, config, invalid):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "proof"})
    with pytest.raises(InvalidData) as raised:
        await hass.config_entries.flow.async_configure(
            result["flow_id"], user_input=config | invalid
        )
    assert set(invalid) <= set(raised.value.schema_errors)


async def test_legacy_options_are_retired_but_existing_settings_still_load(
    hass, entry, config, devices
):
    hass.config_entries.async_update_entry(entry, options=config | {"brightness_pct": 42})
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.runtime_data.config["brightness_pct"] == 42
    assert not entry.supports_options
    assert await hass.config_entries.async_reload(entry.entry_id)
    assert entry.runtime_data.config["brightness_pct"] == 42
    assert not entry.supports_options


@pytest.mark.parametrize("name", ["Occupied", "Window lights"])
async def test_gui_bootstrap_requires_a_name_before_creating_a_disabled_controller(
    hass, devices, name
):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    assert result["errors"] == {}
    assert result["data_schema"]({}) == {"name": "Occupied"}
    assert not hass.config_entries.async_entries("occupied")
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": name}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == result["data"]["name"] == name
    await hass.async_block_till_done()
    entry = result["result"]
    assert entry.runtime_data.program.name == name
    assert not entry.runtime_data.enabled and not entry.runtime_data.program.steps
    assert not devices
    assert not entry.supports_options


async def test_gui_name_conflict_requires_user_to_choose_another_name(hass, devices):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "Occupied"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    assert result["errors"] == {}
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": " occupied "}
    )
    assert result["errors"] == {"name": "name_already_exists"}
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": " "}
    )
    assert result["errors"] == {"name": "name_required"}
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": " Guest house "}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == result["data"]["program"]["name"] == "Guest house"
    await hass.async_block_till_done()
    entries = hass.config_entries.async_entries("occupied")
    assert [entry.title for entry in entries] == ["Occupied", "Guest house"]
    assert entries[0].unique_id != entries[1].unique_id
