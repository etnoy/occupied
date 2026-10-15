"""Persistent controller controls, independent of whether the activation gate passes."""

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .engine_daily import DailyEngine
from .entity import OccupiedEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    engine = entry.runtime_data
    entities = [OccupiedPermissionSwitch(engine)]
    if isinstance(engine, DailyEngine):
        entities.append(OccupiedEnforceStateSwitch(engine))
    async_add_entities(entities)


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


class OccupiedEnforceStateSwitch(OccupiedEntity, SwitchEntity):
    _attr_translation_key = "enforce_state_on_start"
    _attr_icon = "mdi:state-machine"

    def __init__(self, engine) -> None:
        super().__init__(engine)
        self._attr_unique_id = f"{engine.entry_id}_enforce_state_on_start"

    @property
    def is_on(self) -> bool:
        return self.engine.enforce_state_on_start

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.engine.async_set_enforce_state_on_start(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.engine.async_set_enforce_state_on_start(False)
