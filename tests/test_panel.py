"""Public HA panel registration, authenticated API, and browser-independent dispatch."""

import re
from datetime import timedelta
from pathlib import Path

import pytest
from homeassistant.components.frontend import DATA_PANELS
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed


async def test_panel_and_status_then_browser_closure(
    hass, entry, devices, saved_permission, freezer, hass_ws_client
):
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    panel = hass.data[DATA_PANELS]["occupied"]
    assert panel.require_admin
    module_url = panel.config["_panel_custom"]["module_url"]
    assert re.fullmatch(r"/occupied_static/[0-9a-f]{16}/occupied-panel\.js", module_url)
    assert panel.config["config_entry_id"] == entry.entry_id
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "occupied/status", "config_entry_id": entry.entry_id})
    response = await client.receive_json()
    assert response["success"]
    assert response["result"]["status"] == "transitioning"
    assert response["result"]["events"]
    await client.close()
    freezer.move_to(dt_util.utcnow() + timedelta(seconds=75))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    assert any(call.domain == "remote" and call.service == "turn_on" for call in devices)
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert "occupied" not in hass.data[DATA_PANELS]


async def test_status_requires_admin(
    hass, entry, devices, hass_ws_client, hass_read_only_access_token
):
    assert await hass.config_entries.async_setup(entry.entry_id)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await client.send_json({"id": 1, "type": "occupied/status", "config_entry_id": entry.entry_id})
    response = await client.receive_json()
    assert not response["success"]
    assert response["error"]["code"] == "unauthorized"


async def test_unknown_entry_status_is_actionable(hass, entry, devices, hass_ws_client):
    assert await hass.config_entries.async_setup(entry.entry_id)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "occupied/status", "config_entry_id": "missing"})
    response = await client.receive_json()
    assert not response["success"]
    assert response["error"]["code"] == "not_loaded"


@pytest.mark.parametrize(
    "asset", [path.name for path in Path("custom_components/occupied/frontend").glob("*.js")]
)
async def test_bundled_asset_is_served_without_household_data(
    hass, entry, devices, hass_client, asset
):
    assert await hass.config_entries.async_setup(entry.entry_id)
    client = await hass_client()
    module_url = hass.data[DATA_PANELS]["occupied"].config["_panel_custom"]["module_url"]
    asset_url = f"{module_url.rsplit('/', 1)[0]}/{asset}"
    response = await client.get(asset_url)
    assert response.status == 200
    assert "max-age" not in response.headers.get("Cache-Control", "")
    source = await response.text()
    if asset == "occupied-panel.js":
        assert 'customElements.define("occupied-panel"' in source
    assert "light.proof" not in source
    assert "remote.harmony" not in source
    assert entry.entry_id not in source
