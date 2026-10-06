"""Persistent permission, independent of whether the activation gate passes."""

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .entity import OccupiedEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    async_add_entities([OccupiedPermissionSwitch(entry.runtime_data)])


class OccupiedPermissionSwitch(OccupiedEntity, SwitchEntity):
    _attr_translation_key = "enabled"
    _attr_icon = "mdi:home-lock"

    def __init__(self, engine) -> None:
        super().__init__(engine)
        self._attr_unique_id = f"{engine.entry_id}_enabled"

    @property
    def is_on(self) -> bool:
        return self.engine.enabled

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.engine.async_set_enabled(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.engine.async_set_enabled(False)
