"""A local bundled panel using HA's public custom-panel contract."""

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, PANEL_URL


async def async_register_panel(hass: HomeAssistant, entry_id: str) -> None:
    data = hass.data.setdefault(DOMAIN, {})
    if not data.get("static_registered"):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    PANEL_URL, str(Path(__file__).parent / "frontend" / "occupied-panel.js"), True
                )
            ]
        )
        # HA's static-route API has no unregister operation. Keep this single
        # public, configuration-free asset route and reuse it after reload.
        data["static_registered"] = True
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=DOMAIN,
        webcomponent_name="occupied-panel",
        sidebar_title="Occupied",
        sidebar_icon="mdi:home-clock",
        module_url=PANEL_URL,
        require_admin=True,
        config={"config_entry_id": entry_id},
    )


@callback
def async_remove_panel(hass: HomeAssistant) -> None:
    if DOMAIN in hass.data.get(frontend.DATA_PANELS, {}):
        frontend.async_remove_panel(hass, DOMAIN)
