"""Show Occupied's successful device actions in Home Assistant Activity."""

from homeassistant.core import callback

from .const import DOMAIN, EVENT_ACTION


@callback
def async_describe_events(hass, async_describe_event):
    """Register the controller's action events with the Activity integration."""

    @callback
    def describe(event):
        return {
            "name": event.data["name"],
            "message": event.data["message"],
            "entity_id": event.data["entity_id"],
            "context_id": event.context_id,
            "icon": "mdi:home-clock",
        }

    async_describe_event(DOMAIN, EVENT_ACTION, describe)
