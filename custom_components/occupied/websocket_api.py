"""Authenticated status and pure canonical draft/preview operations."""

import asyncio
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
        websocket_program,
        websocket_catalog,
        websocket_editor_validate,
        websocket_save,
        websocket_timeline,
        websocket_subscribe,
        websocket_source,
        websocket_reload,
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


@websocket_api.websocket_command(
    {
        **_DRAFT_SCHEMA,
        vol.Required("type"): "occupied/apply",
        vol.Optional("expected_revision"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_apply(hass, connection, msg):
    await _apply_program(hass, connection, msg)


async def _apply_program(hass, connection, msg, *, editor_save=False):
    from . import resolve_engine
    from .activation import ActivationGate
    from .const import DOMAIN
    from .editor import current_revision, installed_issues, program_document
    from .engine_daily import DailyEngine
    from .file_config import load_program
    from .storage import program_store
    from .validation import ProgramError, RevisionConflict, condition_data, program_data

    try:
        program = await hass.async_add_executor_job(load_program, msg["program"])
        lock = hass.data[DOMAIN].setdefault("editor_lock", asyncio.Lock())
        async with lock:
            engine = resolve_engine(hass, msg["config_entry_id"])
            if getattr(engine, "source_manager", None) and engine.source_manager.mode == "file":
                raise HomeAssistantError(
                    "The managed file is authoritative. Export your draft "
                    "or explicitly switch to GUI storage."
                )
            expected = msg.get("expected_revision")
            if expected is not None and expected != current_revision(engine):
                raise RevisionConflict(
                    "The program changed. Reload the saved program before saving."
                )
            if editor_save:
                errors = [
                    issue for issue in installed_issues(hass, program) if issue.severity == "error"
                ]
                if errors:
                    raise ProgramError(errors)
            gate = ActivationGate(hass, [condition_data(c) for c in program.activation.conditions])
            await gate.async_prepare()
            if hasattr(engine, "async_replace_program"):
                await engine.async_replace_program(program, expected_revision=expected)
            else:
                candidate = DailyEngine(hass, engine.entry_id, program)
                await candidate.async_prepare()
                await candidate._ensure_plans()
                if candidate._storage_failed:
                    raise HomeAssistantError(candidate.last_error)
                await program_store(hass, engine.entry_id).async_save(program_data(program))
                if not await hass.config_entries.async_reload(engine.entry_id):
                    raise HomeAssistantError("Could not load the saved daily program")
            engine = resolve_engine(hass, msg["config_entry_id"])
            connection.send_result(
                msg["id"],
                {"valid": True, **program_document(engine)},
            )
    except ProgramError as err:
        connection.send_result(
            msg["id"], {"valid": False, "issues": [i.to_dict() for i in err.issues]}
        )
    except RevisionConflict as err:
        connection.send_error(msg["id"], "revision_conflict", str(err))
    except (HomeAssistantError, ValueError, vol.Invalid) as err:
        connection.send_error(msg["id"], "apply_failed", str(err))


_ENTRY_SCHEMA = {vol.Required("config_entry_id"): str}


@websocket_api.websocket_command(
    {
        **_ENTRY_SCHEMA,
        vol.Required("type"): "occupied/source",
        vol.Required("source"): vol.In(["gui", "file"]),
        vol.Optional("config_file"): str,
        vol.Required("expected_revision"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_source(hass, connection, msg):
    from . import resolve_engine
    from .editor import program_document
    from .validation import ProgramError, RevisionConflict

    try:
        engine = resolve_engine(hass, msg["config_entry_id"])
        manager = getattr(engine, "source_manager", None)
        if manager is None:
            raise HomeAssistantError(
                "Apply the daily starter program before selecting a managed file"
            )
        if msg["source"] == "file" and not msg.get("config_file"):
            raise HomeAssistantError("Choose a relative managed-file path")
        await manager.async_select(msg["source"], msg.get("config_file"), msg["expected_revision"])
        connection.send_result(msg["id"], {"valid": True, **program_document(engine)})
    except RevisionConflict as err:
        connection.send_error(msg["id"], "revision_conflict", str(err))
    except ProgramError as err:
        connection.send_result(
            msg["id"], {"valid": False, "issues": [i.to_dict() for i in err.issues]}
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "source_failed", str(err))


@websocket_api.websocket_command({**_ENTRY_SCHEMA, vol.Required("type"): "occupied/reload"})
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_reload(hass, connection, msg):
    from . import resolve_engine

    try:
        engine = resolve_engine(hass, msg["config_entry_id"])
        manager = getattr(engine, "source_manager", None)
        if manager is None:
            raise HomeAssistantError("Select a managed file before reloading")
        connection.send_result(msg["id"], await manager.async_reload())
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "reload_failed", str(err))


@websocket_api.websocket_command({**_ENTRY_SCHEMA, vol.Required("type"): "occupied/program"})
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_program(hass, connection, msg):
    from . import resolve_engine
    from .editor import program_document

    try:
        result = program_document(resolve_engine(hass, msg["config_entry_id"]))
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "not_loaded", str(err))
        return
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command({**_ENTRY_SCHEMA, vol.Required("type"): "occupied/catalog"})
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_catalog(hass, connection, msg):
    from . import resolve_engine
    from .editor import async_catalog

    try:
        resolve_engine(hass, msg["config_entry_id"])
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "not_loaded", str(err))
        return
    connection.send_result(msg["id"], await async_catalog(hass))


@websocket_api.websocket_command(
    {**_DRAFT_SCHEMA, vol.Required("type"): "occupied/editor_validate"}
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_editor_validate(hass, connection, msg):
    from .editor import installed_issues
    from .file_config import load_program
    from .preview import validate_draft

    def validate(source):
        return validate_draft(source)

    # Pure loading runs in the executor; registry/state checks stay on HA's loop.
    from . import resolve_engine
    from .validation import ProgramError

    try:
        resolve_engine(hass, msg["config_entry_id"])
        result = await hass.async_add_executor_job(validate, msg["program"])
        program = await hass.async_add_executor_job(load_program, result["program"])
        result["issues"].extend(issue.to_dict() for issue in installed_issues(hass, program))
        result["valid"] = not any(i["severity"] == "error" for i in result["issues"])
    except ProgramError as err:
        result = {"valid": False, "issues": [i.to_dict() for i in err.issues]}
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "not_loaded", str(err))
        return
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        **_DRAFT_SCHEMA,
        vol.Required("type"): "occupied/save",
        vol.Required("expected_revision"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_save(hass, connection, msg):
    await _apply_program(hass, connection, msg, editor_save=True)


@websocket_api.websocket_command(
    {
        **_ENTRY_SCHEMA,
        vol.Required("type"): "occupied/timeline",
        vol.Optional("date"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_timeline(hass, connection, msg):
    from . import resolve_engine
    from .editor import timeline_document

    try:
        day = date.fromisoformat(msg["date"]) if "date" in msg else None
        result = timeline_document(resolve_engine(hass, msg["config_entry_id"]), day)
    except (HomeAssistantError, ValueError) as err:
        connection.send_error(msg["id"], "timeline_failed", str(err))
        return
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command({**_ENTRY_SCHEMA, vol.Required("type"): "occupied/subscribe"})
@websocket_api.require_admin
@callback
def websocket_subscribe(hass, connection, msg):
    from homeassistant.helpers.dispatcher import async_dispatcher_connect

    from . import resolve_engine

    try:
        engine = resolve_engine(hass, msg["config_entry_id"])
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "not_loaded", str(err))
        return

    @callback
    def changed():
        try:
            data = resolve_engine(hass, msg["config_entry_id"]).snapshot()
        except HomeAssistantError:
            data = {"loaded": False}
        connection.send_event(msg["id"], data)

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, engine.signal, changed)
    connection.send_result(msg["id"])
    changed()


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
