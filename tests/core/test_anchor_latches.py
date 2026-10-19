"""Reached anchors survive while their source dates remain in the runtime window."""

import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from custom_components.occupied.anchor_latches import AnchorLatches
from custom_components.occupied.planner import generate_plan
from custom_components.occupied.runtime_planning import runtime_dates
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import validate_program


@pytest.mark.parametrize("timezone", ["UTC", "Europe/Stockholm", "Pacific/Kiritimati"])
def test_latches_survive_midnight_and_expire_outside_runtime_window(timezone):
    zone = ZoneInfo(timezone)
    anchor = datetime(2026, 10, 25, 17, tzinfo=zone)
    tomorrow = anchor + timedelta(days=1)
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Local date",
            "steps": {
                "after": {
                    "timing": {"relative_to": {"entity": "sensor.alarm", "start_offset": "30m"}},
                    "action": "turn_on",
                    "entities": ["switch.proof"],
                }
            },
        }
    )
    context = PlanningContext(
        timezone, time_sources={"sensor.alarm": {"kind": "timestamp", "state": anchor.isoformat()}}
    )
    latches = AnchorLatches()
    latches.apply(program, context, anchor - timedelta(minutes=1))
    advanced = PlanningContext(
        timezone,
        time_sources={"sensor.alarm": {"kind": "timestamp", "state": tomorrow.isoformat()}},
    )
    latched = latches.apply(program, advanced, anchor)
    plan = generate_plan(program, anchor.date(), 0, context=latched)
    assert plan.events[0].at == anchor + timedelta(minutes=30)
    restored = AnchorLatches()
    restored.restore(json.loads(json.dumps(latches.snapshot())))
    midnight = tomorrow.replace(hour=0, minute=0)
    still_today = restored.apply(program, advanced, midnight - timedelta(microseconds=1))
    assert (
        generate_plan(program, anchor.date(), 0, context=still_today).events[0].at
        == plan.events[0].at
    )
    next_date = restored.apply(program, advanced, midnight)
    assert generate_plan(program, anchor.date(), 0, context=next_date).events == plan.events
    assert generate_plan(program, tomorrow.date(), 0, context=next_date).events[
        0
    ].at == tomorrow + timedelta(minutes=30)
    reached_tomorrow = restored.apply(program, advanced, tomorrow)
    assert set(reached_tomorrow.time_source_latches) == {
        anchor.date().isoformat(),
        tomorrow.date().isoformat(),
    }
    later = tomorrow + timedelta(days=1)
    while anchor.date() in runtime_dates(program, later.date()):
        later += timedelta(days=1)
    pruned = restored.apply(program, advanced, later)
    assert anchor.date().isoformat() not in pruned.time_source_latches
    assert all(
        record["date"] != anchor.date().isoformat() for record in restored.snapshot()["records"]
    )
