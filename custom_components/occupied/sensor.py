"""Compact status and next-event entities."""

from datetime import datetime

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .entity import OccupiedEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    async_add_entities(
        [OccupiedStatusSensor(entry.runtime_data), OccupiedNextEventSensor(entry.runtime_data)]
    )


class OccupiedStatusSensor(OccupiedEntity, SensorEntity):
    _attr_translation_key = "status"
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = [
        "disabled",
        "waiting",
        "inactive",
        "paused",
        "transitioning",
        "active",
        "complete",
    ]
    _attr_icon = "mdi:home-clock"

    def __init__(self, engine) -> None:
        super().__init__(engine)
        self._attr_unique_id = f"{engine.entry_id}_status"

    @property
    def native_value(self) -> str:
        return self.engine.status

    @property
    def extra_state_attributes(self) -> dict:
        return {
            "reason": self.engine.reason,
            "session": self.engine.session,
            "remote_owned": self.engine.remote_owned,
            "last_error": self.engine.last_error,
        }


class OccupiedNextEventSensor(OccupiedEntity, SensorEntity):
    _attr_translation_key = "next_event"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, engine) -> None:
        super().__init__(engine)
        self._attr_unique_id = f"{engine.entry_id}_next_event"

    @property
    def native_value(self) -> datetime | None:
        return self.engine.next_event
