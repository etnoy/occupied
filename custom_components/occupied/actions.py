"""Capability-aware HA service preparation and conservative observations."""

from homeassistant.components.light import LightEntityFeature
from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN

from .lighting import LightState


def observe(hass, entity):
    state = hass.states.get(entity)
    if state is None or state.state in {STATE_UNKNOWN, STATE_UNAVAILABLE}:
        return None
    # Observe attributes relevant to ownership, rather than volatile telemetry.
    return {
        "state": state.state,
        "attributes": {
            key: list(state.attributes[key])
            if isinstance(state.attributes[key], tuple)
            else state.attributes[key]
            for key in (
                "brightness",
                "color_temp_kelvin",
                "hs_color",
                "rgb_color",
                "current_activity",
                "media_content_id",
                "media_content_type",
                "source",
            )
            if key in state.attributes
        },
    }


def light_observation(hass, entity):
    value = observe(hass, entity)
    if value is None or value["state"] not in {STATE_ON, STATE_OFF}:
        return None
    attrs = value["attributes"]
    return LightState(
        value["state"],
        attrs.get("brightness", 255) * 100 / 255 if value["state"] == STATE_ON else 0,
        attrs.get("color_temp_kelvin"),
        tuple(attrs["hs_color"]) if "hs_color" in attrs else None,
        tuple(attrs["rgb_color"]) if "rgb_color" in attrs else None,
    )


def light_capabilities(hass, entity):
    state = hass.states.get(entity)
    modes = set(state.attributes.get("supported_color_modes", ())) if state else set()
    return (
        bool(modes - {"onoff", "unknown"}),
        bool(
            state and state.attributes.get("supported_features", 0) & LightEntityFeature.TRANSITION
        ),
    )


def light_matches(hass, entity, target):
    current = light_observation(hass, entity)
    if current is None or current.state != target.state:
        return False
    if target.state == "off":
        return True
    from .planner import ResolvedAction

    data = target.to_dict()
    data.pop("state")
    action = ResolvedAction("light.turn_on", (entity,), data, (entity,), True)
    data = service_payload(hass, action)
    if (
        "brightness_pct" in data
        and abs(current.brightness_pct - data["brightness_pct"]) > 100 / 255
    ):
        return False
    for key in ("color_temp_kelvin", "hs_color", "rgb_color"):
        if key in data:
            expected, actual = data[key], getattr(current, key)
            if isinstance(expected, (list, tuple)):
                expected = tuple(expected)
            if expected != actual:
                return False
    return True


def service_payload(hass, action):
    data = dict(action.data)
    if action.targets:
        data["entity_id"] = list(action.targets) if len(action.targets) > 1 else action.targets[0]
    if action.action.startswith("light.") and action.targets:
        entity = action.targets[0]
        dimmable, transition = light_capabilities(hass, entity)
        if not dimmable:
            for key in (
                "brightness",
                "brightness_pct",
                "transition",
                "color_temp_kelvin",
                "hs_color",
                "rgb_color",
            ):
                data.pop(key, None)
        elif not transition:
            data.pop("transition", None)
        state = hass.states.get(entity)
        modes = set(state.attributes.get("supported_color_modes", ())) if state else set()
        if "color_temp" not in modes:
            data.pop("color_temp_kelvin", None)
        if not modes & {"hs", "rgb", "rgbw", "rgbww", "xy"}:
            data.pop("hs_color", None)
            data.pop("rgb_color", None)
    return data
