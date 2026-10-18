"""Bounded recognition of device reports progressing toward a dispatched target."""

import math
from datetime import datetime, timedelta


def motion_for(action, observed, now):
    if observed is None:
        return None
    data = action.data
    targets = {}
    state = observed["state"]
    if action.action in {"light.turn_on", "light.turn_off"} and data.get("transition", 0) > 0:
        duration = data["transition"]
        state = "on" if action.action.endswith("turn_on") else "off"
        if state == "off":
            targets["brightness"] = 0
        elif "brightness" in data or "brightness_pct" in data:
            targets["brightness"] = data.get(
                "brightness", data.get("brightness_pct", 0) * 255 / 100
            )
        for key in ("color_temp_kelvin", "hs_color", "rgb_color"):
            if key in data:
                targets[key] = data[key]
        if observed["state"] == "off" and "brightness" in targets:
            observed = observed | {"attributes": observed["attributes"] | {"brightness": 0}}
        states = {observed["state"], state}
    elif action.action.startswith("cover."):
        duration = 300
        service = action.action.split(".")[1]
        tilt = "tilt" in service
        attribute = "current_tilt_position" if tilt else "current_position"
        value = data.get("tilt_position" if tilt else "position")
        if service.startswith("open_"):
            value = 100
        elif service.startswith("close_"):
            value = 0
        if value is None:
            return None
        targets[attribute] = value
        initial = observed["attributes"].get(attribute)
        if initial is None:
            return None
        state = observed["state"] if tilt else "closed" if value == 0 else "open"
        states = {observed["state"], state, "opening" if value > initial else "closing"}
    else:
        return None
    # Unknown brightness cannot establish a safe direction of travel.
    if not targets or any(observed["attributes"].get(key) is None for key in targets):
        return None
    return {
        "observed": observed,
        "targets": targets,
        "states": sorted(states),
        "state": state,
        "deadline": (now + timedelta(seconds=duration)).isoformat(),
    }


def progresses(motion, observed, now):
    if observed is None or now > datetime.fromisoformat(motion["deadline"]):
        return False
    previous, targets = motion["observed"], motion["targets"]
    if observed["state"] == "off" and "brightness" in targets:
        observed = observed | {"attributes": observed["attributes"] | {"brightness": 0}}
    if observed["state"] not in motion["states"]:
        return False
    attrs, before = observed["attributes"], previous["attributes"]
    # HA derives color attributes from each other; compare the requested mode.
    ignored = (
        {"hs_color", "rgb_color", "color_temp_kelvin"}
        if any(key in targets for key in ("hs_color", "rgb_color", "color_temp_kelvin"))
        else set()
    )
    if any(
        attrs.get(key) != before.get(key)
        for key in (attrs.keys() | before.keys()) - targets.keys() - ignored
    ):
        return False
    for key, target in targets.items():
        old, new = before.get(key), attrs.get(key)
        if isinstance(target, (list, tuple)):
            if not isinstance(old, (list, tuple)) or not isinstance(new, (list, tuple)):
                return False
            if len(old) != len(new) or len(new) != len(target):
                return False
            values = zip(old, new, target, strict=True)
        else:
            values = [(old, new, target)]
        for index, (initial, current, end) in enumerate(values):
            if not all(
                isinstance(value, (int, float)) and math.isfinite(value)
                for value in (initial, current, end)
            ):
                return False
            if key == "hs_color" and index == 0:
                end = (end - initial + 180) % 360 - 180
                current = (current - initial + 180) % 360 - 180
                initial = 0
            if not min(initial, end) <= current <= max(initial, end):
                return False
    motion["observed"] = observed
    return True
