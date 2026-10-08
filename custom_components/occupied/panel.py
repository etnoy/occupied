"""A local bundled panel using HA's public custom-panel contract."""

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
    frontend_path = Path(__file__).parent / "frontend" / "dist"
    version = await hass.async_add_executor_job(_asset_version, frontend_path)
    asset_url = f"/occupied_static/{version}"
    registered_paths = data.setdefault("static_registered_paths", set())
    if asset_url not in registered_paths:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(asset_url, str(frontend_path), False)]
        )
        # HA's static-route API has no unregister operation. Keep each
        # configuration-free, content-versioned asset route for panel reloads.
        registered_paths.add(asset_url)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=DOMAIN,
        webcomponent_name="occupied-panel",
        # The HA URL and common reverse proxies cache JavaScript by URL, even
        # when the integration serves it without cache headers. A content hash
        # keeps the entry module and all of its relative imports on one bundle.
        module_url=f"{asset_url}/occupied-panel.js",
        require_admin=True,
        config_panel_domain=DOMAIN,
        config={"config_entry_id": entry_id},
    )


@callback
def async_remove_panel(hass: HomeAssistant) -> None:
    if DOMAIN in hass.data.get(frontend.DATA_PANELS, {}):
        frontend.async_remove_panel(hass, DOMAIN)
