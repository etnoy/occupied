"""Readable device activity for successfully handled Occupied service calls."""

from homeassistant.core import callback

from .compat import controller_device
from .const import EVENT_ACTION


def _action_message(action, target, data):
    domain, service = action.split(".")
    if domain == "scene" and service == "turn_on":
        return f"Activated {target}"
    if domain == "remote" and service == "turn_on" and "activity" in data:
        return f"Started activity {data['activity']} on {target}"
    if service in {"set_cover_position", "set_cover_tilt_position"}:
        field = "tilt_position" if service == "set_cover_tilt_position" else "position"
        if field in data:
            axis = "tilt position" if field == "tilt_position" else "position"
            return f"Set {axis} of {target} to {data[field]}%"
    verbs = {
        "turn_on": "Turned on",
        "turn_off": "Turned off",
        "open_cover": "Opened",
        "close_cover": "Closed",
        "stop_cover": "Stopped",
        "open_cover_tilt": "Opened tilt of",
        "close_cover_tilt": "Closed tilt of",
        "stop_cover_tilt": "Stopped tilt of",
    }
    message = f"{verbs[service]} {target}" if service in verbs else f"Called {action} for {target}"
    if domain == "light" and service == "turn_on":
        brightness = data.get("brightness_pct")
        if brightness is None and "brightness" in data:
            brightness = round(data["brightness"] * 100 / 255)
        if brightness is not None:
            message += f" at {brightness}% brightness"
    if "transition" in data:
        message += f" (transition: {data['transition']}s)"
    return message


@callback
def async_log_action(engine, action, targets, data, context):
    """Attribute each target to the controller device and the service context."""
    device = controller_device(engine.hass, engine.entry_id)
    for entity_id in targets:
        state = engine.hass.states.get(entity_id)
        name = state.attributes.get("friendly_name") if state else None
        target = f"{name} ({entity_id})" if name and name != entity_id else entity_id
        event = {
            "name": engine.config["name"],
            "message": _action_message(action, target, data),
            "entity_id": entity_id,
            "config_entry_id": engine.entry_id,
        }
        if device:
            event["device_id"] = device.id
        engine.hass.bus.async_fire(EVENT_ACTION, event, context=context)
