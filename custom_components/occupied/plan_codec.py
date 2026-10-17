"""HA-free codecs for saved plans and resolved actions."""

from datetime import UTC, date, datetime

from .planner import PLANNER_VERSION, DailyPlan, PlanEvent, ResolvedAction
from .validation import Issue


def instant(value: str) -> datetime:
    result = datetime.fromisoformat(value)
    if result.tzinfo is None:
        raise ValueError("Saved runtime instants must be timezone aware")
    return result.astimezone(UTC)


def action_from_data(data):
    action, entities = data["action"], tuple(data["entities"])
    if "." not in action or not entities:
        raise ValueError("Saved actions require a resolved service and entities")
    return ResolvedAction(
        action,
        entities,
        dict(data.get("data", {})),
        entities,
        action in {"light.turn_on", "light.turn_off", "switch.turn_on", "switch.turn_off"},
    )


def events_from_data(items):
    return tuple(
        PlanEvent(
            i["id"],
            instant(i["time"]),
            i["source_id"],
            action_from_data(i["action"]),
            i.get("sequence", index),
            i["kind"],
            i.get("custom", False),
            i.get("scheduled", False),
            instant(i["authored_at"]) if i.get("authored_at") else None,
            i.get("configured_index", 0),
            i.get("tick", 0),
            i.get("tick_count", 0),
            i.get("period_seconds", 0),
            i.get("superseded", False),
        )
        for index, i in enumerate(items)
    )


def plan_from_data(data):
    if data["planner_version"] != PLANNER_VERSION:
        raise ValueError("Unsupported saved planner version")
    # The shape check rejects obsolete caches without changing version numbers.
    events = events_from_data(data["events"])
    start, end = instant(data["start"]), instant(data["end"])
    if (
        start >= end
        or len(events) > 50000
        or any(i.get("kind") not in {"step", "random_start", "random_end"} for i in data["events"])
    ):
        raise ValueError("Invalid saved plan")
    return DailyPlan(
        date.fromisoformat(data["simulation_date"]),
        str(data["seed"]),
        data["behavior_hash"],
        data["source_revision"],
        data["timezone"],
        start,
        end,
        tuple(sorted(events, key=lambda e: e.order_key)),
        {key: instant(value) for key, value in data["steps"].items()},
        tuple(
            Issue(
                i["code"],
                i["message"],
                tuple(i.get("model_path", ())),
                i["severity"],
                i.get("line"),
                i.get("column"),
                i.get("details"),
            )
            for i in data["issues"]
        ),
        history_events=events_from_data(data.get("history_events", [])),
        future_events=events_from_data(data.get("future_events", [])),
    )
