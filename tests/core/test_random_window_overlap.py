"""Fixed overlaps are invalid; dynamic overlaps skip only their dated random item."""

from datetime import date, timedelta

import pytest

from custom_components.occupied.planner import generate_plan, preview_dates
from custom_components.occupied.preview import validate_draft
from custom_components.occupied.time_utils import PlanningContext, SimulationDay
from custom_components.occupied.validation import ProgramError, validate_program

CTX = PlanningContext("Europe/Stockholm", 59.3, 18.1)


def program(start, end):
    return {
        "schema_version": 1,
        "name": "Window",
        "random": {
            "evening": {
                "start": start,
                "end": end,
                "min_duration": "5m",
                "max_duration": "5m",
                "count": 1,
                "on": {"action": "turn_on", "entities": ["switch.proof"]},
                "off": {"action": "turn_off", "entities": ["switch.proof"]},
            }
        },
    }


def clock(start, end=None):
    return {"absolute_time": {"start": start, **({"end": end} if end else {})}}


@pytest.mark.parametrize(
    ("start", "end"),
    [
        (clock("22:00", "23:30"), clock("23:00", "23:59")),
        (clock("18:00", "20:00"), clock("19:00", "21:00")),
        (clock("23:00", "01:00"), clock("00:00", "02:00")),
    ],
)
def test_overlapping_clock_ranges_are_hard_validation_errors(start, end):
    with pytest.raises(ProgramError) as error:
        validate_program(program(start, end))
    assert any(
        issue.code == "random_window_overlap"
        and issue.severity == "error"
        and issue.path == ("random", "evening", "end")
        for issue in error.value.issues
    )


def test_solar_overlap_is_skipped_independently_of_the_sample():
    source = validate_program(program(clock("20:00", "22:00"), {"relative_to": {"sun": "sunset"}}))
    day = date(2026, 5, 10)
    for seed in range(20):
        plan = generate_plan(source, day, seed, context=CTX)
        assert plan.feasible and not plan.events
        assert any(
            issue.code == "random_window_overlap" and issue.severity == "warning"
            for issue in plan.issues
        )


def test_time_helper_overlap_is_a_warning_skip():
    source = validate_program(
        program(clock("22:00", "23:30"), {"relative_to": {"entity": "input_datetime.closing"}})
    )
    context = PlanningContext(
        "UTC", time_sources={"input_datetime.closing": {"kind": "time", "state": "23:15:00"}}
    )
    plan = generate_plan(source, date(2026, 10, 13), 0, context=context)
    assert plan.feasible and not plan.events
    assert any(
        issue.code == "random_window_overlap" and issue.severity == "warning"
        for issue in plan.issues
    )


def anchored_program(solar=False):
    candidate = program(
        {"relative_to": {"sun": "sunset", "end_offset": "2h"}}
        if solar
        else {"relative_to": {"step": "dinner", "end_offset": "1h"}},
        clock("23:00") if solar else clock("22:00", "23:00"),
    )
    candidate["steps"] = {
        "morning": {"timing": clock("07:00"), "action": "turn_on", "entities": ["switch.morning"]},
        "dinner": {
            "timing": clock("18:00", "21:30"),
            "action": "turn_on",
            "entities": ["switch.dinner"],
        },
    }
    return candidate


def test_sampled_parent_overlap_never_blocks_the_rest_of_the_plan():
    candidate = anchored_program()
    assert any(
        issue["code"] == "random_window_overlap_risk"
        for issue in validate_draft(candidate)["issues"]
    )
    source = validate_program(candidate)
    skipped = 0
    dates = [date(2026, 10, 1) + timedelta(days=day) for day in range(31)]
    for plan in preview_dates(source, dates, 0, context=CTX):
        assert plan.feasible
        assert any(event.source_id == "morning" for event in plan.events)
        if any(issue.code == "random_window_overlap" for issue in plan.issues):
            skipped += 1
            assert not any(event.source_id == "evening" for event in plan.events)
    assert 0 < skipped < 31


def test_midsummer_solar_overlap_keeps_unrelated_steps():
    source = validate_program(anchored_program(solar=True))
    october = generate_plan(source, date(2026, 10, 13), 0, context=CTX)
    summer = generate_plan(source, date(2027, 6, 21), 0, context=CTX)
    assert october.feasible and summer.feasible
    assert any(event.source_id == "evening" for event in october.events)
    assert any(event.source_id == "morning" for event in summer.events)
    assert not any(event.source_id == "evening" for event in summer.events)
    assert any(
        issue.code == "random_window_overlap" and issue.severity == "warning"
        for issue in summer.issues
    )


@pytest.mark.parametrize("solar", [False, True])
def test_overnight_rollover_uses_wholly_earlier_unsampled_bounds(solar):
    # Under the selected rule, winter sunset is an overnight end when its
    # entire range precedes the 20–21 start window, just like fixed 22–02.
    source = validate_program(
        program(
            clock("20:00", "21:00") if solar else clock("22:00"),
            {"relative_to": {"sun": "sunset"}} if solar else clock("02:00"),
        )
    )
    day = date(2026, 1, 10)
    tomorrow = SimulationDay(source, day + timedelta(days=1), CTX, [])
    end = (
        tomorrow.sun_bounds(source.random["evening"].end.relative_to, ())[0]
        if solar
        else tomorrow.clock("02:00", ())
    )
    start = SimulationDay(source, day, CTX, []).clock("20:00" if solar else "22:00", ())
    for seed in range(20):
        plan = generate_plan(source, day, seed, context=CTX)
        assert plan.feasible and len(plan.events) == 2
        assert all(start <= event.at <= end for event in plan.events)
