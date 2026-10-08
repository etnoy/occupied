"""HA stores and strict codecs for saved plans and immutable activity lifecycles."""

from datetime import UTC, date, datetime

from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store

from .models import Action
from .planner import PLANNER_VERSION, DailyPlan, PlanEvent, PlannedInterval, ResolvedAction
from .validation import Issue


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


def instant(value: str) -> datetime:
    result = datetime.fromisoformat(value)
    if result.tzinfo is None:
        raise ValueError("Saved runtime instants must be timezone aware")
    return result.astimezone(UTC)


def action_from_data(data: dict) -> ResolvedAction:
    action = Action.model_validate(data)
    if action.targets.groups or "." not in action.action:
        raise ValueError("Saved actions must contain resolved services and entity targets")
    return ResolvedAction(
        action.action,
        action.targets.entities,
        dict(action.data),
        action.resources,
        action.replay_safe,
    )


def plan_from_data(data: dict) -> DailyPlan:
    if data["planner_version"] != PLANNER_VERSION:
        raise ValueError("Unsupported saved planner version")
    events = tuple(
        PlanEvent(
            item["id"],
            instant(item["time"]),
            item["source_id"],
            item["kind"],
            action_from_data(item["action"]),
            item.get("sequence", index),
            item["priority"],
            item["lease_id"],
        )
        for index, item in enumerate(data["events"])
    )
    intervals = tuple(
        PlannedInterval(
            item["id"],
            item["source_id"],
            item["kind"],
            instant(item["start"]),
            instant(item["end"]),
            tuple(item["resources"]),
            tuple(item["groups"]),
            item["duration_seconds"],
            instant(item["start_complete"]) if item["start_complete"] else None,
            item["stop_behavior"],
            instant(item["cleanup_complete"]) if item.get("cleanup_complete") else None,
        )
        for item in data["intervals"]
    )
    start, end = instant(data["start"]), instant(data["end"])
    if start >= end or len(events) > 50000 or len(intervals) > 10000:
        raise ValueError("Invalid or oversized saved plan")
    if any(
        item.kind
        not in {
            "step",
            "activity_start",
            "activity_end",
            "window_start",
            "window_end",
            "window_action_start",
            "window_action_end",
        }
        for item in events
    ):
        raise ValueError("Unknown saved event kind")
    if any(item.start >= item.end for item in intervals):
        raise ValueError("Invalid saved interval ordering")
    return DailyPlan(
        date.fromisoformat(data["simulation_date"]),
        str(data["seed"]),
        data["behavior_hash"],
        data["source_revision"],
        data["timezone"],
        start,
        end,
        tuple(sorted(events, key=lambda item: item.order_key)),
        intervals,
        {key: instant(value) for key, value in data["steps"].items()},
        tuple(
            Issue(
                item["code"],
                item["message"],
                tuple(item.get("model_path", ())),
                item["severity"],
                item.get("line"),
                item.get("column"),
            )
            for item in data["issues"]
        ),
    )
