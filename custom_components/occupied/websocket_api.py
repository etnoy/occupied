"""Authenticated status only; no browser scheduling or draft editor in stage one."""

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError


@callback
def async_register_websocket(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, websocket_status)


@websocket_api.websocket_command(
    {vol.Required("type"): "occupied/status", vol.Required("config_entry_id"): str}
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_status(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    # Imported here to avoid the lifecycle module's registration cycle.
    from . import resolve_engine

    try:
        engine = resolve_engine(hass, msg["config_entry_id"])
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "not_loaded", str(err))
        return
    connection.send_result(msg["id"], engine.snapshot())
