"""HA lifecycle; imports are deferred so the planner/CLI can run without HA."""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant, ServiceCall
    from homeassistant.helpers.typing import ConfigType

    from .engine import OccupiedEngine
    from .engine_daily import DailyEngine

type OccupiedConfigEntry = ConfigEntry[OccupiedEngine | DailyEngine]


def _config_schema(config):
    """Optional unattended bootstrap; retain pure CLI imports without HA dependencies."""
    import voluptuous as vol

    return vol.Schema(
        {vol.Optional("occupied"): vol.Schema({vol.Required("config_file"): str})},
        extra=vol.ALLOW_EXTRA,
    )(config)


CONFIG_SCHEMA = _config_schema


def resolve_engine(hass: HomeAssistant, entry_id: str) -> OccupiedEngine | DailyEngine:
    """Reject ambiguous, missing, unloaded, and foreign integration entries."""
    from homeassistant.exceptions import HomeAssistantError

    from .const import DOMAIN

    entry = hass.config_entries.async_get_entry(entry_id)
    if entry is None or entry.domain != DOMAIN or not hasattr(entry, "runtime_data"):
        raise HomeAssistantError("Occupied config entry is not loaded")
    engine = entry.runtime_data
    if engine.closed:
        raise HomeAssistantError("Occupied config entry is unloaded")
    return engine


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register services once; they resolve the currently loaded entry at call time."""
    import voluptuous as vol
    from homeassistant.core import SupportsResponse
    from homeassistant.exceptions import HomeAssistantError, Unauthorized

    from .const import DOMAIN
    from .websocket_api import async_register_websocket

    hass.data.setdefault(DOMAIN, {})

    async def control(call: ServiceCall):
        if call.context.user_id:
            user = await hass.auth.async_get_user(call.context.user_id)
            if user is None or not user.is_admin:
                raise Unauthorized()
        engine = resolve_engine(hass, call.data["config_entry_id"])
        if call.service == "reload":
            manager = getattr(engine, "source_manager", None)
            if manager is None:
                raise HomeAssistantError("Select a managed file before reloading")
            result = await manager.async_reload()
            if not result["valid"] and not call.return_response:
                raise HomeAssistantError(
                    "Managed file validation failed; see Occupied Configuration and Repairs"
                )
            return result if call.return_response else None
        if call.service in {"start", "stop"}:
            await engine.async_set_enabled(call.service == "start")
        elif call.service == "set_dry_run":
            if not hasattr(engine, "async_set_dry_run"):
                raise HomeAssistantError("Apply a daily program before selecting dry run")
            await engine.async_set_dry_run(call.data["dry_run"])
        else:
            await engine.async_set_paused(call.service == "pause")

    schema = vol.Schema({vol.Required("config_entry_id"): str})
    for service in ("start", "stop", "pause", "resume"):
        hass.services.async_register(DOMAIN, service, control, schema=schema)
    hass.services.async_register(
        DOMAIN, "reload", control, schema=schema, supports_response=SupportsResponse.OPTIONAL
    )
    hass.services.async_register(
        DOMAIN,
        "set_dry_run",
        control,
        schema=vol.Schema({vol.Required("config_entry_id"): str, vol.Required("dry_run"): bool}),
    )
    async_register_websocket(hass)
    from .managed import check_bootstrap

    bootstrap = hass.data[DOMAIN]["bootstrap"] = config.get(DOMAIN)
    entries = hass.config_entries.async_entries(DOMAIN)
    if entries:
        check_bootstrap(hass, entries[0], bootstrap)
    elif bootstrap:
        hass.async_create_task(
            hass.config_entries.flow.async_init(
                DOMAIN, context={"source": "import"}, data=bootstrap
            )
        )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: OccupiedConfigEntry) -> bool:
    """Initialize entities, a bundled panel, then HA state listeners and timers."""
    import voluptuous as vol
    from homeassistant.exceptions import ConfigEntryError

    from .config_flow import validate_input
    from .const import DOMAIN, PLATFORMS
    from .engine import OccupiedEngine
    from .panel import async_register_panel, async_remove_panel
    from .storage import program_store
    from .validation import ProgramError, validate_program

    if any(other.entry_id != entry.entry_id for other in hass.config_entries.async_entries(DOMAIN)):
        raise ConfigEntryError("Occupied supports one household entry")
    managed = entry.data.get("source") == "file"
    from .managed import check_bootstrap

    check_bootstrap(hass, entry, hass.data[DOMAIN].get("bootstrap"))
    source = (
        {"schema_version": 1, "name": entry.data.get("name", "House")}
        if managed
        else await program_store(hass, entry.entry_id).async_load() or entry.data.get("program")
    )
    if managed:
        from .file_config import load_yaml, read_managed

        try:
            text, _digest = await hass.async_add_executor_job(
                read_managed, hass.config.config_dir, entry.data["config_file"]
            )
            source = await hass.async_add_executor_job(load_yaml, text)
        except ProgramError:
            # Keep an invalid initial entry loadable, with an inactive engine and Repairs.
            pass
    if source is not None:
        from .engine_daily import DailyEngine

        try:
            program = await hass.async_add_executor_job(validate_program, source)
        except ProgramError as err:
            raise ConfigEntryError(f"Invalid Occupied program: {err}") from err
        engine = entry.runtime_data = DailyEngine(hass, entry.entry_id, program)
        engine.configuration_ready = not managed
    else:
        try:
            config = validate_input(dict(entry.options or entry.data))
        except vol.Invalid as err:
            raise ConfigEntryError(f"Invalid Occupied configuration: {err}") from err
        engine = entry.runtime_data = OccupiedEngine(hass, entry.entry_id, config)
    try:
        await engine.async_prepare()
        if hasattr(engine, "async_replace_program"):
            from .managed import SourceManager

            await SourceManager(hass, entry, engine).async_start()
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
        await async_register_panel(hass, entry.entry_id)
        await engine.async_start()
    except Exception:
        await engine.async_close()
        async_remove_panel(hass)
        await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
        raise
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    return True


async def _async_options_updated(hass: HomeAssistant, entry: OccupiedConfigEntry) -> None:
    if not hasattr(entry.runtime_data, "async_replace_program"):
        await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: OccupiedConfigEntry) -> bool:
    """Invalidate pending work first, then end an owned activity and remove resources."""
    from .const import PLATFORMS
    from .panel import async_remove_panel

    await entry.runtime_data.async_close()
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        async_remove_panel(hass)
    return unloaded


async def async_remove_entry(hass: HomeAssistant, entry: OccupiedConfigEntry) -> None:
    """Remove this entry's private stores after HA unloads it; retain managed YAML."""
    from homeassistant.helpers import issue_registry as ir

    from .const import DOMAIN
    from .storage import DurableStore

    for suffix in ("program", "permission", "runtime"):
        await DurableStore(hass, 1, f"{DOMAIN}.{entry.entry_id}.{suffix}").async_remove()
    ir.async_delete_issue(hass, DOMAIN, f"managed_file_{entry.entry_id}")
    ir.async_delete_issue(hass, DOMAIN, "source_conflict")
