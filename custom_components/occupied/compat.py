"""Small, feature-detected adapters for APIs inside the supported HA window."""

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr

from .const import DOMAIN


@callback
def controller_device(hass: HomeAssistant, entry_id: str) -> dr.DeviceEntry | None:
    """Find this entry's controller without invoking deprecated registry methods."""
    # remove_when_floor: 2026.8.0
    registry = dr.async_get(hass)
    if hasattr(registry, "async_get_device_by_identifier"):
        return registry.async_get_device_by_identifier((DOMAIN, entry_id), entry_id)
    device = registry.async_get_device(identifiers={(DOMAIN, entry_id)})
    return device if device and entry_id in device.config_entries else None
