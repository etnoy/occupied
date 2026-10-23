"""Restore explicit device states, never replay commands with unknown effects."""

from dataclasses import replace

# Services whose result is a persistent, directly observable state.
POWER_DOMAINS = frozenset(
    {"switch", "input_boolean", "remote", "fan", "humidifier", "media_player", "light", "siren"}
)
SETTERS = {
    "lock.lock": {"_state": (None, "locked")},
    "lock.unlock": {"_state": (None, "unlocked")},
    "select.select_option": {"_state": ("option", None)},
    "input_select.select_option": {"_state": ("option", None)},
    "number.set_value": {"_state": ("value", None)},
    "input_number.set_value": {"_state": ("value", None)},
    "input_text.set_value": {"_state": ("value", None)},
    "climate.set_hvac_mode": {"_state": ("hvac_mode", None)},
    "climate.turn_off": {"_state": (None, "off")},
    "climate.set_temperature": {
        "temperature": ("temperature", None),
        "target_temp_low": ("target_temp_low", None),
        "target_temp_high": ("target_temp_high", None),
        "_state": ("hvac_mode", None),
    },
    "climate.set_preset_mode": {"preset_mode": ("preset_mode", None)},
    "climate.set_fan_mode": {"fan_mode": ("fan_mode", None)},
    "climate.set_swing_mode": {"swing_mode": ("swing_mode", None)},
    "climate.set_swing_horizontal_mode": {"swing_horizontal_mode": ("swing_horizontal_mode", None)},
    "fan.set_percentage": {"percentage": ("percentage", None)},
    "fan.set_preset_mode": {"preset_mode": ("preset_mode", None)},
    "fan.set_direction": {"direction": ("direction", None)},
    "fan.oscillate": {"oscillating": ("oscillating", None)},
    "humidifier.set_humidity": {"humidity": ("humidity", None)},
    "humidifier.set_mode": {"mode": ("mode", None)},
    "media_player.volume_set": {"volume_level": ("volume_level", None)},
    "media_player.volume_mute": {"is_volume_muted": ("is_volume_muted", None)},
    "media_player.select_source": {"source": ("source", None)},
    "media_player.select_sound_mode": {"sound_mode": ("sound_mode", None)},
    "media_player.repeat_set": {"repeat": ("repeat", None)},
    "media_player.shuffle_set": {"shuffle": ("shuffle", None)},
    "media_player.media_play": {"_state": (None, "playing")},
    "media_player.media_pause": {"_state": (None, "paused")},
    "media_player.media_stop": {"_state": (None, "idle")},
    "media_player.play_media": {
        "media_content_id": ("media_content_id", None),
        "media_content_type": ("media_content_type", None),
        "_state": (None, "playing"),
    },
    "water_heater.set_temperature": {"temperature": ("temperature", None)},
    "water_heater.set_operation_mode": {"operation_mode": ("operation_mode", None)},
    "water_heater.set_away_mode": {"away_mode": ("away_mode", None)},
    "vacuum.set_fan_speed": {"fan_speed": ("fan_speed", None)},
    "valve.open_valve": {"current_position": (None, 100)},
    "valve.close_valve": {"current_position": (None, 0)},
    "valve.set_valve_position": {"current_position": ("position", None)},
    "text.set_value": {"_state": ("value", None)},
    "date.set_value": {"_state": ("date", None)},
    "time.set_value": {"_state": ("time", None)},
    "vacuum.start": {"_state": (None, "cleaning")},
    "vacuum.pause": {"_state": (None, "paused")},
    "vacuum.return_to_base": {"_state": (None, "docked")},
    "lawn_mower.start_mowing": {"_state": (None, "mowing")},
    "lawn_mower.dock": {"_state": (None, "docked")},
    "lawn_mower.pause": {"_state": (None, "paused")},
}
POWER_FIELDS = {
    "remote": {"activity": "current_activity"},
    "fan": {"percentage": "percentage", "preset_mode": "preset_mode"},
    "humidifier": {},
}
OBSERVED_ATTRIBUTES = frozenset(
    attr for spec in SETTERS.values() for attr in spec if attr != "_state"
) | frozenset(attr for fields in POWER_FIELDS.values() for attr in fields.values())


def state_effects(action, entity):
    """Return known postconditions, or None for opaque/relative/one-shot calls."""
    domain, service = action.action.split(".")
    target_domain = entity.split(".")[0]
    if domain == "homeassistant" and service in {"turn_on", "turn_off"}:
        domain = target_domain
    if domain != target_domain:
        return None
    if domain in POWER_DOMAINS and service in {"turn_on", "turn_off"}:
        fields = POWER_FIELDS.get(domain, {}) if service == "turn_on" else {}
        if action.data.keys() - fields.keys():
            return None
        effects = {"_state": "on" if service == "turn_on" else "off"}
        effects.update(
            {attr: action.data[key] for key, attr in fields.items() if key in action.data}
        )
        if domain == "fan" and action.data.get("percentage") == 0:
            effects["_state"] = "off"
        return effects
    spec = SETTERS.get(action.action)
    if spec is None:
        return None
    if (
        action.action == "media_player.play_media"
        and not {"media_content_id", "media_content_type"} <= action.data.keys()
    ):
        return None
    if action.data.keys() - {key for key, _ in spec.values() if key is not None}:
        return None
    effects = {
        attr: value if key is None else action.data[key]
        for attr, (key, value) in spec.items()
        if key is None or key in action.data
    }
    if action.action == "fan.set_percentage" and "percentage" in action.data:
        effects["_state"] = "on" if action.data["percentage"] else "off"
    if action.action == "water_heater.set_away_mode" and "away_mode" in action.data:
        effects["away_mode"] = "on" if action.data["away_mode"] else "off"
    return effects or None


def project_devices(program, plan, at, *, yielded=frozenset()):
    from .models import controlled_entities

    entities = controlled_entities(program) - yielded
    states = {}
    for event in plan.events:
        if event.at > at:
            break
        if event.superseded:
            continue
        for entity in entities.intersection(event.action.targets):
            if entity.startswith(("light.", "cover.", "switch.")):
                continue
            effects = state_effects(event.action, entity)
            if effects is None:
                states.pop(entity, None)
                continue
            actions = states.setdefault(entity, [])
            # New intent replaces calls touching the same property. An off action
            # ends the previous powered session, including its activity/settings.
            if effects.get("_state") == "off":
                actions.clear()
            retained = []
            for previous in actions:
                overlap = state_effects(previous, entity).keys() & effects.keys()
                if not overlap:
                    retained.append(previous)
                elif previous.action in SETTERS:
                    # Preserve independent fields from multi-property setters.
                    spec = SETTERS[previous.action]
                    removed = {spec[attr][0] for attr in overlap if attr in spec}
                    if None in removed:
                        continue
                    data = {k: v for k, v in previous.data.items() if k not in removed}
                    if data:
                        retained.append(replace(previous, data=data))
            actions[:] = retained
            current = replace(event.action, targets=(entity,), resources=(entity,))
            same = next((a for a in actions if a.action == current.action), None)
            if same:
                actions.remove(same)
                current = replace(current, data=same.data | current.data)
            actions.append(current)
    return states


def device_matches(hass, entity, action):
    effects = state_effects(action, entity)
    state = hass.states.get(entity)
    if effects is None or state is None:
        return False
    for attr, target in effects.items():
        actual = state.state if attr == "_state" else state.attributes.get(attr)
        if attr == "current_position" and actual is None and entity.startswith("valve."):
            if (target, state.state) in {(100, "open"), (0, "closed")}:
                continue
        if (
            attr == "_state"
            and target == "on"
            and entity.startswith("media_player.")
            and actual not in {"off", "unknown", "unavailable"}
        ):
            continue
        if attr == "_state" and entity.startswith(("number.", "input_number.")):
            try:
                if float(actual) == float(target):
                    continue
            except (ValueError, TypeError):
                pass
        if actual != target:
            return False
    return True
