"""HA must never cache an enabled Configure button for retired legacy options."""

from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.occupied.editor import current_revision


async def test_options_remain_unsupported_after_conversion(hass, entry, devices, hass_ws_client):
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert not entry.supports_options
    engine = entry.runtime_data
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/save",
            "config_entry_id": entry.entry_id,
            "program": {"schema_version": 1, "name": "Converted"},
            "expected_revision": current_revision(engine),
        }
    )
    assert (await client.receive_json())["result"]["valid"]
    await hass.async_block_till_done()
    assert entry.runtime_data.program.name == "Converted"
    assert not entry.supports_options


async def test_managed_entries_have_no_options_button(hass):
    entry = MockConfigEntry(
        domain="occupied", data={"source": "file", "config_file": "occupied/missing.yaml"}
    )
    entry.add_to_hass(hass)
    assert not entry.supports_options
