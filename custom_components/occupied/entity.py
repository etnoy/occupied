"""Shared event-driven entity state."""

from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo, Entity

from .const import DOMAIN
from .engine import OccupiedEngine


class OccupiedEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, engine: OccupiedEngine) -> None:
        self.engine = engine
        entry = engine.hass.config_entries.async_get_entry(engine.entry_id)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, engine.entry_id)},
            name=entry.title if entry is not None else engine.config["name"],
            entry_type=dr.DeviceEntryType.SERVICE,
            manufacturer="Occupied",
            model="Entity controller",
        )

    @property
    def available(self) -> bool:
        return not self.engine.closed

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(self.hass, self.engine.signal, self.async_write_ha_state)
        )
