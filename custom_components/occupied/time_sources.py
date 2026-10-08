"""Copy Home Assistant's known times for the pure planner and editor."""

from datetime import UTC, datetime

from .time_utils import PlanningContext

SOLAR_EVENTS = {
    "sunrise": "Sunrise",
    "sunset": "Sunset",
    "dawn": "Dawn",
    "dusk": "Dusk",
    "noon": "Solar noon",
    "midnight": "Solar midnight",
}


def time_source_snapshot(hass):
    """Read on HA's event loop, never from the planner's executor thread."""
    sources = {}
    for state in hass.states.async_all():
        attrs = state.attributes
        if state.domain == "input_datetime" and attrs.get("has_time"):
            kind = "timestamp" if attrs.get("has_date") else "time"
        elif state.domain == "sensor" and attrs.get("device_class") == "timestamp":
            kind = "timestamp"
        elif state.domain == "calendar":
            kind = "calendar"
        else:
            continue
        sources[state.entity_id] = {
            "kind": kind,
            "state": state.state,
            "start_time": attrs.get("start_time") if kind == "calendar" else None,
            "end_time": attrs.get("end_time") if kind == "calendar" else None,
        }
        # HA datetime helpers store local time without a timezone.
        if state.domain == "input_datetime" and kind == "timestamp":
            stamp = attrs.get("timestamp")
            sources[state.entity_id]["state"] = (
                datetime.fromtimestamp(stamp, UTC).isoformat()
                if isinstance(stamp, (int, float)) and state.state not in {"unknown", "unavailable"}
                else None
            )
        if state.state in {"unknown", "unavailable"}:
            sources[state.entity_id].update(state=None, start_time=None, end_time=None)
    return sources


def planning_context(hass):
    return PlanningContext(
        hass.config.time_zone,
        hass.config.latitude,
        hass.config.longitude,
        hass.config.elevation,
        time_sources=time_source_snapshot(hass),
    )


def time_source_options(hass):
    """Discover entities; solar semantics stay date-aware rather than next-only."""
    options = [
        {"value": f"sun:{event}", "name": name, "group": "Solar events"}
        for event, name in SOLAR_EVENTS.items()
    ]
    for entity_id, source in sorted(time_source_snapshot(hass).items()):
        state = hass.states.get(entity_id)
        group = "Calendars" if source["kind"] == "calendar" else "Home Assistant times"
        if source["kind"] == "calendar":
            for attribute, label in (("start_time", "start"), ("end_time", "end")):
                options.append(
                    {
                        "value": f"entity:{entity_id}:{attribute}",
                        "name": f"{state.name} · {label}",
                        "entity_id": entity_id,
                        "group": group,
                    }
                )
        else:
            options.append(
                {
                    "value": f"entity:{entity_id}",
                    "name": state.name,
                    "entity_id": entity_id,
                    "group": group,
                }
            )
    return options


def source_entities(program):
    return {
        item.when.entity_range.entity_id
        for routine in program.routines
        for item in (*routine.steps, *routine.activities)
        if item.when.entity_range is not None
    }
