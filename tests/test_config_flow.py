"""Real HA config/options flows for independent households."""

import pytest
from homeassistant.data_entry_flow import FlowResultType, InvalidData

from custom_components.occupied.validation import program_data, validate_program


async def test_config_flow_allows_another_independent_entry(hass, config, devices):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "proof"})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], user_input=config)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "House"
    await hass.async_block_till_done()
    assert len(hass.config_entries.async_entries("occupied")) == 1
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
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


async def test_options_can_remove_remote_and_activation_gate(hass, entry, config, devices):
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    old = entry.runtime_data
    result = await hass.config_entries.options.async_init(entry.entry_id)
    new = {
        key: value
        for key, value in config.items()
        if key not in {"remote_entity", "activation_entity"}
    }
    result = await hass.config_entries.options.async_configure(result["flow_id"], user_input=new)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert old.closed
    assert "remote_entity" not in entry.runtime_data.config
    assert not entry.runtime_data.gate.entities
    await entry.runtime_data.async_set_enabled(True)
    assert entry.runtime_data.active
    assert not any(event.kind == "remote_start" for event in entry.runtime_data._queue)


async def test_gui_bootstrap_creates_an_empty_disabled_daily_household(hass, devices):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == result["data"]["name"] == "Occupied"
    await hass.async_block_till_done()
    entry = result["result"]
    assert entry.runtime_data.program.name == "Occupied"
    assert not entry.runtime_data.enabled and not entry.runtime_data.program.routines
    assert not devices
    options = await hass.config_entries.options.async_init(entry.entry_id)
    assert options["type"] is FlowResultType.ABORT
    assert options["reason"] == "daily_program"


async def test_gui_name_conflict_requires_user_to_choose_another_name(hass, devices):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    assert result["errors"] == {"name": "name_already_exists"}
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


async def test_yaml_setup_reports_invalid_input_then_imports_canonical_snapshot(
    hass, devices, program_dict
):
    result = await hass.config_entries.flow.async_init(
        "occupied", context={"source": "user"}, data={"method": "yaml"}
    )
    assert result["step_id"] == "yaml"
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"program": "schema_version: 1\nname: A\nname: B"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_program"}
    import json

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"program": json.dumps(program_dict)}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert result["data"]["program"] == program_data(validate_program(program_dict))
    assert not result["result"].runtime_data.enabled and not devices
