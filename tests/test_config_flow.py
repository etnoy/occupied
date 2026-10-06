"""Real HA config/options flow and single-household installation behavior."""

import pytest
from homeassistant.data_entry_flow import FlowResultType, InvalidData


async def test_config_flow_and_single_entry(hass, config, devices):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], user_input=config)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "House"
    await hass.async_block_till_done()
    assert len(hass.config_entries.async_entries("occupied")) == 1
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


@pytest.mark.parametrize(
    "invalid",
    [
        {"allowed_states": []},
        {"remote_activity": " "},
    ],
)
async def test_invalid_config_is_actionable(hass, config, invalid):
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
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
    result = await hass.config_entries.flow.async_init("occupied", context={"source": "user"})
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
