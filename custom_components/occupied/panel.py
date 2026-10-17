"""A local bundled panel using HA's public custom-panel contract."""

import asyncio
import hashlib
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN


def _asset_version(frontend_path: Path) -> str:
    """Return a content-based URL namespace for the complete frontend bundle."""
    digest = hashlib.sha256()
    for path in sorted(frontend_path.rglob("*")):
        if path.is_file():
            digest.update(path.relative_to(frontend_path).as_posix().encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()[:16]


async def async_register_panel(hass: HomeAssistant, entry_id: str) -> None:
    data = hass.data.setdefault(DOMAIN, {})
    async with data.setdefault("panel_lock", asyncio.Lock()):
        await _async_register_panel(hass, entry_id, data)


async def _async_register_panel(hass, entry_id, data):
    entries = data.setdefault("panel_entries", set())
    if DOMAIN in hass.data.get(frontend.DATA_PANELS, {}):
        entries.add(entry_id)
        return
    frontend_path = Path(__file__).parent / "frontend" / "dist"
    version = await hass.async_add_executor_job(_asset_version, frontend_path)
    asset_url = f"/occupied_static/{version}"
    registered_paths = data.setdefault("static_registered_paths", set())
    if asset_url not in registered_paths:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(asset_url, str(frontend_path), True)]
        )
        # HA's static-route API has no unregister operation. Keep each
        # configuration-free, content-versioned asset route for panel reloads.
        registered_paths.add(asset_url)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=DOMAIN,
        webcomponent_name="occupied-panel",
        # A content hash keeps the entry module and relative imports on one
        # bundle, with a new URL whenever any shipped asset changes.
        module_url=f"{asset_url}/occupied-panel.js",
        require_admin=True,
        config_panel_domain=DOMAIN,
    )
    entries.add(entry_id)


@callback
def async_remove_panel(hass: HomeAssistant, entry_id: str) -> None:
    entries = hass.data.get(DOMAIN, {}).get("panel_entries", set())
    entries.discard(entry_id)
    if not entries and DOMAIN in hass.data.get(frontend.DATA_PANELS, {}):
        frontend.async_remove_panel(hass, DOMAIN)
