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
        websocket_apply,
        websocket_diagnostics,
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


@websocket_api.websocket_command({**_DRAFT_SCHEMA, vol.Required("type"): "occupied/apply"})
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_apply(hass, connection, msg):
    from . import resolve_engine
    from .activation import ActivationGate
    from .engine_daily import DailyEngine
    from .file_config import load_program
    from .storage import program_store
    from .validation import ProgramError, condition_data, program_data

    try:
        engine = resolve_engine(hass, msg["config_entry_id"])
        program = await hass.async_add_executor_job(load_program, msg["program"])
        gate = ActivationGate(hass, [condition_data(c) for c in program.activation.conditions])
        await gate.async_prepare()
        if hasattr(engine, "async_replace_program"):
            await engine.async_replace_program(program)
        else:
            candidate = DailyEngine(hass, engine.entry_id, program)
            await candidate.async_prepare()
            await candidate._ensure_plans()
            if candidate._storage_failed:
                raise HomeAssistantError(candidate.last_error)
            await program_store(hass, engine.entry_id).async_save(program_data(program))
            if not await hass.config_entries.async_reload(engine.entry_id):
                raise HomeAssistantError("Could not load the saved daily program")
        connection.send_result(msg["id"], {"valid": True, "program": program_data(program)})
    except ProgramError as err:
        connection.send_result(
            msg["id"], {"valid": False, "issues": [i.to_dict() for i in err.issues]}
        )
    except (HomeAssistantError, ValueError, vol.Invalid) as err:
        connection.send_error(msg["id"], "apply_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "occupied/diagnostics",
        vol.Required("config_entry_id"): str,
        vol.Optional("include_sensitive", default=False): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_diagnostics(hass, connection, msg):
    from . import resolve_engine
    from .diagnostics import diagnostics_data

    try:
        engine = resolve_engine(hass, msg["config_entry_id"])
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "not_loaded", str(err))
        return
    connection.send_result(
        msg["id"], diagnostics_data(engine, include_sensitive=msg["include_sensitive"])
    )
