"""Synchronize HA entry labels after authoritative program updates."""

from homeassistant.core import callback


@callback
def async_sync_program_name(hass, entry_id, name):
    """Preserve entry data and avoid notifying listeners for unchanged names."""
    entry = hass.config_entries.async_get_entry(entry_id)
    if entry is not None and (entry.title != name or entry.data.get("name") != name):
        hass.config_entries.async_update_entry(entry, title=name, data={**entry.data, "name": name})
