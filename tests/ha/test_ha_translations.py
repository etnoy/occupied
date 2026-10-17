"""Home Assistant services and error responses carry translatable metadata."""

import pytest
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.translation import async_get_translations
from homeassistant.setup import async_setup_component


@pytest.mark.parametrize("case", ["missing", "unloaded", "reload"])
async def test_service_errors_include_translation_metadata(hass, entry, case):
    assert await hass.config_entries.async_setup(entry.entry_id)
    if case == "unloaded":
        await entry.runtime_data.async_close()
    service = "reload" if case == "reload" else "start"
    target = "missing" if case == "missing" else entry.entry_id
    with pytest.raises(HomeAssistantError) as failure:
        await hass.services.async_call(
            "occupied", service, {"config_entry_id": target}, blocking=True
        )
    assert failure.value.translation_domain == "occupied"
    assert (
        failure.value.translation_key
        == {
            "missing": "entry_not_loaded",
            "unloaded": "entry_unloaded",
            "reload": "select_managed_file",
        }[case]
    )
    assert str(failure.value)


async def test_websocket_errors_preserve_translation_metadata(hass, hass_ws_client):
    assert await async_setup_component(hass, "occupied", {})
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "occupied/status", "config_entry_id": "missing"})
    response = await client.receive_json()
    assert not response["success"]
    error = response["error"]
    assert error["code"] == "not_loaded"
    assert error["translation_domain"] == "occupied"
    assert error["translation_key"] == "entry_not_loaded"
    assert error["message"] == "Occupied config entry is not loaded"


@pytest.mark.parametrize("language", ["en", "sv"])
async def test_service_and_exception_catalogs_load_through_home_assistant(hass, language):
    services = await async_get_translations(hass, language, "services", {"occupied"})
    for service in ("start", "stop", "pause", "resume", "reload"):
        prefix = f"component.occupied.services.{service}"
        assert services[f"{prefix}.name"]
        assert services[f"{prefix}.description"]
        assert services[f"{prefix}.fields.config_entry_id.name"]
    exceptions = await async_get_translations(hass, language, "exceptions", {"occupied"})
    message = exceptions["component.occupied.exceptions.entry_not_loaded.message"]
    assert message == (
        "Occupied config entry is not loaded"
        if language == "en"
        else "Occupieds konfigurationspost är inte inläst"
    )
