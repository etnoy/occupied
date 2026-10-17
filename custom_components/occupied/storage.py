"""HA stores and strict codecs for saved plans and immutable activity lifecycles."""

from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store

from .plan_codec import action_from_data as action_from_data
from .plan_codec import events_from_data as events_from_data
from .plan_codec import instant as instant
from .plan_codec import plan_from_data as plan_from_data


class DurableStore(Store):
    """Surface write failures that HA's base Store otherwise only logs."""

    async def _async_write_data(self, data):
        try:
            await super()._async_write_data(data)
        except Exception as err:
            self._write_failure = err
            raise

    async def async_save(self, data):
        self._write_failure = None
        await super().async_save(data)
        if self._write_failure:
            raise HomeAssistantError(f"Cannot persist Occupied state: {self._write_failure}")


def program_store(hass, entry_id):
    return DurableStore(hass, 1, f"occupied.{entry_id}.program", atomic_writes=True)
