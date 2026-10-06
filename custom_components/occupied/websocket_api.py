"""Authenticated status and pure canonical draft/preview operations."""

from datetime import date, datetime
from functools import partial

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError


@callback
def async_register_websocket(hass: HomeAssistant) -> None:
    for command in (
        websocket_status,
        websocket_validate,
        websocket_preview,
        websocket_export,
        websocket_rename_id,
    ):
        websocket_api.async_register_command(hass, command)


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


async def _draft_operation(hass, connection, msg, operation, *args):
    from . import resolve_engine
    from .validation import ProgramError

    try:
        resolve_engine(hass, msg["config_entry_id"])
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "not_loaded", str(err))
        return
    try:
        result = await hass.async_add_executor_job(partial(operation, msg["program"], *args))
    except ProgramError as err:
        result = {"valid": False, "issues": [issue.to_dict() for issue in err.issues]}
    except ValueError as err:
        result = {"valid": False, "issues": [{"code": "input", "message": str(err), "path": "$"}]}
    connection.send_result(msg["id"], {"valid": True, **result})


_DRAFT_SCHEMA = {
    vol.Required("config_entry_id"): str,
    vol.Required("program"): vol.Any(dict, str),
}


@websocket_api.websocket_command({**_DRAFT_SCHEMA, vol.Required("type"): "occupied/validate"})
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_validate(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
):
    from .preview import validate_draft

    await _draft_operation(hass, connection, msg, validate_draft)


@websocket_api.websocket_command(
    {
        **_DRAFT_SCHEMA,
        vol.Required("type"): "occupied/preview",
        vol.Required("date"): str,
        vol.Optional("days", default=1): vol.All(int, vol.Range(min=1, max=31)),
        vol.Required("seed"): vol.Any(str, int),
        vol.Optional("at"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_preview(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
):
    from .preview import preview_draft
    from .time_utils import PlanningContext

    def prepare(source):
        return preview_draft(
            source,
            date.fromisoformat(msg["date"]),
            msg["days"],
            msg["seed"],
            context,
            datetime.fromisoformat(msg["at"]) if "at" in msg else None,
        )

    context = PlanningContext(
        hass.config.time_zone, hass.config.latitude, hass.config.longitude, hass.config.elevation
    )
    await _draft_operation(hass, connection, msg, prepare)


@websocket_api.websocket_command({**_DRAFT_SCHEMA, vol.Required("type"): "occupied/export"})
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_export(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
):
    from .preview import export_draft

    await _draft_operation(hass, connection, msg, export_draft)


@websocket_api.websocket_command(
    {
        **_DRAFT_SCHEMA,
        vol.Required("type"): "occupied/rename_id",
        vol.Required("kind"): vol.In(["group", "routine", "step", "activity", "window"]),
        vol.Required("old"): str,
        vol.Required("new"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_rename_id(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
):
    from .preview import rename_draft

    await _draft_operation(hass, connection, msg, rename_draft, msg["kind"], msg["old"], msg["new"])
