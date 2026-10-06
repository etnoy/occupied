"""HA lifecycle; imports are deferred so the planner/CLI can run without HA."""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant, ServiceCall
    from homeassistant.helpers.typing import ConfigType

    from .engine import OccupiedEngine
    from .engine_daily import DailyEngine

type OccupiedConfigEntry = ConfigEntry[OccupiedEngine | DailyEngine]


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
    from homeassistant.exceptions import HomeAssistantError, Unauthorized

    from .const import DOMAIN
    from .websocket_api import async_register_websocket

    hass.data.setdefault(DOMAIN, {})

    async def control(call: ServiceCall) -> None:
        if call.context.user_id:
            user = await hass.auth.async_get_user(call.context.user_id)
            if user is None or not user.is_admin:
                raise Unauthorized()
        engine = resolve_engine(hass, call.data["config_entry_id"])
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
        DOMAIN,
        "set_dry_run",
        control,
        schema=vol.Schema({vol.Required("config_entry_id"): str, vol.Required("dry_run"): bool}),
    )
    async_register_websocket(hass)
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
    source = await program_store(hass, entry.entry_id).async_load() or entry.data.get("program")
    if source is not None:
        from .engine_daily import DailyEngine

        try:
            program = await hass.async_add_executor_job(validate_program, source)
        except ProgramError as err:
            raise ConfigEntryError(f"Invalid Occupied program: {err}") from err
        engine = entry.runtime_data = DailyEngine(hass, entry.entry_id, program)
    else:
        try:
            config = validate_input(dict(entry.options or entry.data))
        except vol.Invalid as err:
            raise ConfigEntryError(f"Invalid Occupied configuration: {err}") from err
        engine = entry.runtime_data = OccupiedEngine(hass, entry.entry_id, config)
    try:
        await engine.async_prepare()
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
