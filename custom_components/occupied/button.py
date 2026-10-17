"""Explicit reconciliation of the controller's current expected device states."""

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .engine_daily import DailyEngine
from .entity import OccupiedEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    if isinstance(engine := entry.runtime_data, DailyEngine):
        async_add_entities([OccupiedEnforceStateButton(engine)])


class OccupiedEnforceStateButton(OccupiedEntity, ButtonEntity):
    _attr_translation_key = "enforce_state_now"
    _attr_icon = "mdi:sync"

    def __init__(self, engine) -> None:
        super().__init__(engine)
        self._attr_unique_id = f"{engine.entry_id}_enforce_state_now"

    async def async_press(self) -> None:
        await self.engine.async_enforce_state_now()
