"""Shared event-driven entity state."""

from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo, Entity

from .const import DOMAIN
from .engine import OccupiedEngine


class OccupiedEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, engine: OccupiedEngine) -> None:
        self.engine = engine
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, engine.entry_id)},
            name=f"Occupied {engine.config['name']}",
            manufacturer="Occupied",
            model="Household simulator",
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(self.hass, self.engine.signal, self.async_write_ha_state)
        )
