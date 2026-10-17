"""Bootstrap imports accept managed-file declarations, not program documents."""

from homeassistant.data_entry_flow import FlowResultType


async def test_bootstrap_import_rejects_a_program_document(hass, program_dict):
    result = await hass.config_entries.flow.async_init(
        "occupied", context={"source": "import"}, data=program_dict
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "invalid_program"
    assert not hass.config_entries.async_entries("occupied")
