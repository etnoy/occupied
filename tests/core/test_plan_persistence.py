"""Compact provenance restores per-date source context and cross-date staggering."""

from dataclasses import replace
from datetime import date, timedelta

import pytest

from custom_components.occupied.plan_persistence import (
    plan_context,
    plan_fingerprint,
    restore_plan_fingerprints,
)
from custom_components.occupied.planner import generate_plan, supersede_ticks
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import validate_program


@pytest.mark.parametrize("drifted", [None, 0, 1])
def test_each_date_regenerates_from_its_original_source_context(drifted):
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Clock",
            "steps": {
                "on": {
                    "timing": {"relative_to": {"entity": "input_datetime.clock"}},
                    "action": "turn_on",
                    "entities": ["switch.proof"],
                }
            },
        }
    )
    records, originals = [], {}
    for offset, value in enumerate(["18:00:00", "19:00:00"]):
        context = PlanningContext(
            "UTC",
            time_sources={
                "input_datetime.clock": {"kind": "time", "state": value},
                "sensor.unrelated": {"kind": "timestamp", "state": "not part of the program"},
            },
        )
        day = date(2026, 10, 13) + timedelta(days=offset)
        plan = generate_plan(program, day, "persisted-seed", context=context)
        saved_context = plan_context(program, context)
        assert "sensor.unrelated" not in saved_context["time_sources"]
        records.append(plan_fingerprint(plan, saved_context))
        originals[day] = plan.to_dict()
    if drifted is not None:
        records[drifted]["fingerprint"] = "outdated-fingerprint"
    restored = restore_plan_fingerprints(program, records)
    assert {day: plan.to_dict() for day, plan in restored.items()} == originals


def test_cross_date_superseded_ticks_restore_identically():
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Across midnight",
            "steps": {
                "fade": {
                    "timing": {"absolute_time": {"start": "23:59:55"}},
                    "action": "turn_on",
                    "entities": ["light.a", "light.b"],
                    "stagger": {"enabled": True, "period": "20s"},
                },
                "off": {
                    "timing": {"absolute_time": {"start": "00:00:05"}},
                    "action": "turn_off",
                    "entities": ["light.a", "light.b"],
                },
            },
        }
    )
    context = PlanningContext("UTC")
    plans = [
        generate_plan(program, date(2026, 10, 13) + timedelta(days=offset), "seed", context=context)
        for offset in range(2)
    ]
    resolved = {
        event.id: event
        for event in supersede_ticks(event for plan in plans for event in plan.events)
    }
    plans = [
        replace(plan, events=tuple(resolved[event.id] for event in plan.events)) for plan in plans
    ]
    assert any(event.superseded for event in plans[0].events)
    records = [plan_fingerprint(plan, plan_context(program, context)) for plan in plans]
    restored = restore_plan_fingerprints(program, records)
    assert {day: plan.to_dict() for day, plan in restored.items()} == {
        plan.simulation_date: plan.to_dict() for plan in plans
    }
