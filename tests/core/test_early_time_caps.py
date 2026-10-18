"""Source-date caps earlier than the whole base window are visible warnings."""

from datetime import UTC, date, datetime

import pytest

from custom_components.occupied.planner import generate_plan
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import validate_program, validation_warnings


def program(timing):
    return validate_program(
        {
            "schema_version": 1,
            "name": "Early cap",
            "steps": {
                "evening": {"timing": timing, "action": "turn_on", "entities": ["light.proof"]}
            },
        }
    )


@pytest.mark.parametrize(
    "start,end,cap,warn",
    [
        ("23:00", "01:00", "00:30", True),
        ("18:00", None, "17:00", True),
        ("18:00", "20:00", "19:00", False),
        ("18:00", "20:00", "18:00", False),
    ],
)
def test_clock_cap_warning_in_validation_and_plan(start, end, cap, warn):
    timing = {"absolute_time": {"start": start}, "latest_at": {"absolute_time": {"start": cap}}}
    if end:
        timing["absolute_time"]["end"] = end
    value = program(timing)
    warnings = validation_warnings(value)
    assert bool(warnings) is warn
    plan = generate_plan(value, date(2026, 10, 13), "seed", context=PlanningContext("UTC"))
    issues = [issue for issue in plan.issues if issue.code == "latest_at_before_start"]
    assert len(issues) == int(warn)
    if warn:
        assert issues[0].severity == "warning"
        assert issues[0].path == ("steps", "evening", "timing", "latest_at")
        assert plan.step_times["evening"] == datetime.fromisoformat(f"2026-10-13T{cap}+00:00")
        assert plan.feasible


@pytest.mark.parametrize("source", ["sun", "entity"])
def test_contextual_base_warns_after_resolution(monkeypatch, source):
    monkeypatch.setattr(
        "custom_components.occupied.time_utils.sunset",
        lambda *args, **kwargs: datetime(2026, 10, 13, 19, tzinfo=UTC),
    )
    timing = {
        "relative_to": {"sun": "sunset"} if source == "sun" else {"entity": "sensor.alarm"},
        "latest_at": {"absolute_time": {"start": "00:30"}},
    }
    context = PlanningContext(
        "UTC",
        59.3,
        18.1,
        time_sources={"sensor.alarm": {"kind": "timestamp", "state": "2026-10-13T19:00:00+00:00"}},
    )
    result = generate_plan(program(timing), date(2026, 10, 13), "seed", context=context)
    assert any(
        issue.code == "latest_at_before_start" and issue.severity == "warning"
        for issue in result.issues
    )
