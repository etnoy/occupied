"""HA stores and strict codecs for saved plans and immutable activity lifecycles."""

from datetime import UTC, date, datetime

from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store

from .planner import PLANNER_VERSION, DailyPlan, PlanEvent, ResolvedAction
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


def plan_from_data(data):
    if data["planner_version"] != PLANNER_VERSION:
        raise ValueError("Unsupported saved planner version")
    # The shape check rejects obsolete caches without changing version numbers.
    events = tuple(
        PlanEvent(i["id"], instant(i["time"]), i["source_id"], action_from_data(i["action"]), index)
        for index, i in enumerate(data["events"])
    )
    start, end = instant(data["start"]), instant(data["end"])
    if start >= end or len(events) > 50000 or any(i.get("kind") != "step" for i in data["events"]):
        raise ValueError("Invalid saved step plan")
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
            )
            for i in data["issues"]
        ),
    )
