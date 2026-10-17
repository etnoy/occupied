"""Controller devices have independent names and stable registry identities."""

from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def load(hass, title):
    entry = MockConfigEntry(
        domain="occupied",
        title=title,
        unique_id=title,
        data={"name": title, "program": {"schema_version": 1, "name": title}},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def device(hass, entry):
    return next(
        device
        for device in dr.async_entries_for_config_entry(dr.async_get(hass), entry.entry_id)
        if ("occupied", entry.entry_id) in device.identifiers
    )


def control(hass, entry):
    return er.async_get(hass).async_get_entity_id("switch", "occupied", f"{entry.entry_id}_enabled")


async def test_controllers_create_distinct_named_service_devices(hass):
    main, guest = await load(hass, "Main house"), await load(hass, "Guest house")
    first, second = device(hass, main), device(hass, guest)
    assert first.name == "Main house" and second.name == "Guest house"
    assert first.id != second.id
    assert first.entry_type is second.entry_type is dr.DeviceEntryType.SERVICE
    assert control(hass, main).startswith("switch.main_house_")
    assert control(hass, guest).startswith("switch.guest_house_")
    assert control(hass, main) != control(hass, guest)


async def test_entry_rename_updates_device_and_preserves_user_name_and_entity_id(hass):
    entry = await load(hass, "Occupied")
    original_device, entity_id = device(hass, entry), control(hass, entry)
    dr.async_get(hass).async_update_device(original_device.id, name_by_user="Favorite controller")
    engine = entry.runtime_data
    hass.config_entries.async_update_entry(entry, title="Renamed controller")
    await hass.async_block_till_done()
    renamed = device(hass, entry)
    assert renamed.name == "Renamed controller"
    assert renamed.name_by_user == "Favorite controller"
    assert renamed.id == original_device.id and control(hass, entry) == entity_id
    assert entry.runtime_data is engine and not engine.closed
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert device(hass, entry).id == original_device.id
    assert control(hass, entry) == entity_id
