"""Determinism, midnight/DST, and source-date scheduling."""

from datetime import UTC, date, datetime, timedelta

import pytest

from custom_components.occupied.models import WEEKDAYS
from custom_components.occupied.planner import generate_plan, preview_dates
from custom_components.occupied.runtime_planning import runtime_dates
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import ProgramError, validate_program

CTX = PlanningContext("UTC", 59.3, 18.1)


def plan(raw, day=date(2026, 10, 13), context=CTX, seed=1):
    return generate_plan(validate_program(raw), day, seed, context=context)


def test_uniform_bounds_and_relative_elapsed_time(program_dict):
    for seed in range(30):
        p = plan(program_dict, seed=seed)
        assert (
            datetime(2026, 10, 13, 6, 40, tzinfo=UTC)
            <= p.step_times["wake"]
            <= datetime(2026, 10, 13, 7, 20, tzinfo=UTC)
        )
        offset = (p.step_times["leave"] - p.step_times["wake"]).total_seconds()
        assert 1800 <= offset <= 2700
        assert {e.action.action for e in p.events} == {"light.turn_on", "light.turn_off"}


def test_fixed_and_overnight_dates(program_dict):
    program_dict["steps"]["wake"]["timing"] = {"absolute_time": {"start": "23:50"}}
    program_dict["steps"]["leave"]["timing"] = {
        "relative_to": {"step": "wake", "start_offset": "30m"}
    }
    for s in program_dict["steps"].values():
        s["days"] = ["mon"]
    p = plan(program_dict, date(2026, 10, 12))
    assert p.step_times["leave"] == datetime(2026, 10, 13, 0, 20, tzinfo=UTC)
    assert p.start == datetime(2026, 10, 12, tzinfo=UTC)
    assert p.end == datetime(2026, 10, 13, tzinfo=UTC)
    assert not plan(program_dict, date(2026, 10, 13)).events


def test_overnight_window_inferred(program_dict):
    program_dict["steps"]["wake"]["timing"] = {"absolute_time": {"start": "23:00", "end": "01:00"}}
    p = plan(program_dict)
    assert (
        datetime(2026, 10, 13, 23, tzinfo=UTC)
        <= p.step_times["wake"]
        <= datetime(2026, 10, 14, 1, tzinfo=UTC)
    )


def test_metadata_reordering_and_unrelated_steps_preserve_samples(program_dict):
    before = plan(program_dict)
    program_dict["name"] = "Renamed"
    program_dict["steps"] = dict(reversed(program_dict["steps"].items()))
    program_dict["steps"]["wake"]["name"] = "Another title"
    after = plan(program_dict)
    assert before.step_times == after.step_times and before.behavior_hash == after.behavior_hash
    program_dict["steps"]["extra"] = {
        "timing": {"absolute_time": {"start": "12:00", "end": "15:00"}},
        "action": "turn_on",
        "entities": ["switch.other"],
    }
    assert all(plan(program_dict).step_times[k] == v for k, v in before.step_times.items())


def test_date_streams_match_week_and_single_preview(program_dict):
    p = validate_program(program_dict)
    week = preview_dates(p, [date(2026, 10, d) for d in range(12, 19)], 7, context=CTX)
    assert preview_dates(p, [date(2026, 10, 13)], 7, context=CTX)[0].to_dict() == week[1].to_dict()


def test_disabled_parent_suppresses_child(program_dict):
    program_dict["steps"]["wake"]["enabled"] = False
    p = plan(program_dict)
    assert not p.events and any(i.code == "anchor_skipped" for i in p.issues)


@pytest.mark.parametrize(
    "parent_days,child_days,child_dates",
    [
        (["mon", "wed"], ["mon", "tue", "wed"], {12, 14}),
        (["mon", "tue", "wed"], ["tue"], {13}),
        (["mon"], ["tue"], set()),
    ],
    ids=["narrower-parent", "narrower-child", "disjoint-days"],
)
def test_independent_weekdays_filter_parent_occurrences_across_midnight(
    program_dict, parent_days, child_days, child_dates
):
    program_dict["steps"]["wake"].update(
        days=parent_days, timing={"absolute_time": {"start": "23:50"}}
    )
    program_dict["steps"]["leave"].update(
        days=child_days,
        timing={"relative_to": {"step": "wake", "start_offset": "30m"}},
    )
    for day_number in range(12, 19):
        source_date = date(2026, 10, day_number)
        result = plan(program_dict, source_date)
        assert result.feasible
        if day_number in child_dates:
            assert result.step_times["leave"] == datetime.combine(
                source_date + timedelta(days=1), datetime.min.time(), UTC
            ) + timedelta(minutes=20)
            assert any(event.source_id == "leave" for event in result.events)
        else:
            assert "leave" not in result.step_times
            assert all(event.source_id != "leave" for event in result.events)
        if WEEKDAYS[source_date.weekday()] in child_days and "wake" not in result.step_times:
            assert any(issue.code == "anchor_skipped" for issue in result.issues)


@pytest.mark.parametrize("solar", ["sunrise", "sunset", "dawn", "dusk", "noon", "midnight"])
def test_solar_picker_events(program_dict, solar):
    program_dict["steps"]["wake"]["timing"] = {
        "relative_to": {"sun": solar, "start_offset": "-10m", "end_offset": "10m"}
    }
    assert len(plan(program_dict).events) == 4


def test_polar_sun_skips_dependents(program_dict):
    program_dict["steps"]["wake"]["timing"] = {"relative_to": {"sun": "sunset"}}
    p = plan(program_dict, date(2026, 6, 20), PlanningContext("Europe/Oslo", 78.2, 15.6))
    assert not p.events and any(i.code == "sun_unavailable" for i in p.issues)


@pytest.mark.parametrize(
    "day,hours,expected",
    [
        (date(2026, 3, 29), 23, "2026-03-29T01:00:00+00:00"),
        (date(2026, 10, 25), 25, "2026-10-25T00:30:00+00:00"),
    ],
)
def test_dst_gap_and_first_repeated_time(program_dict, day, hours, expected):
    program_dict["steps"]["wake"]["timing"] = {"absolute_time": {"start": "02:30"}}
    p = plan(program_dict, day, PlanningContext("Europe/Stockholm"))
    assert (p.end - p.start).total_seconds() == hours * 3600
    assert p.step_times["wake"].isoformat() == expected


@pytest.mark.parametrize(
    "source,value,kind,attribute",
    [
        ("input_datetime.alarm", "06:00", "time", None),
        ("sensor.alarm", "2026-10-13T06:00:00+00:00", "timestamp", None),
        ("calendar.work", "2026-10-13T06:00:00", "calendar", "start_time"),
    ],
)
def test_known_entity_sources(program_dict, source, value, kind, attribute):
    relative = {"entity": source, "start_offset": "-10m"}
    if attribute:
        relative["attribute"] = attribute
    program_dict["steps"]["wake"]["timing"] = {"relative_to": relative}
    context = PlanningContext(
        "UTC", time_sources={source: {"kind": kind, attribute or "state": value}}
    )
    assert plan(program_dict, context=context).step_times["wake"].hour == 5
    other = plan(program_dict, date(2026, 10, 14), context)
    assert ("wake" in other.step_times) == (kind == "time")


def test_missing_entity_source_skips_chain(program_dict):
    program_dict["steps"]["wake"]["timing"] = {"relative_to": {"entity": "sensor.alarm"}}
    assert not plan(program_dict).events


def test_context_and_live_budget(program_dict):
    with pytest.raises(ProgramError):
        plan(program_dict, context=PlanningContext())
    program_dict["steps"]["leave"]["timing"]["relative_to"].update(
        start_offset="168h", end_offset="168h"
    )
    assert len(runtime_dates(validate_program(program_dict), date(2026, 10, 13))) > 7
    for i in range(5):
        program_dict["steps"][f"child_{i}"] = {
            "timing": {
                "relative_to": {
                    "step": "leave" if i == 0 else f"child_{i - 1}",
                    "start_offset": "168h",
                }
            },
            "action": "turn_off",
            "entities": ["light.a"],
        }
    with pytest.raises(ProgramError):
        runtime_dates(validate_program(program_dict), date(2026, 10, 13))


def test_calendar_preview_includes_distant_signed_source_dates(program_dict):
    from custom_components.occupied.planner import preview_calendar_dates

    program_dict["steps"]["wake"]["timing"] = {"absolute_time": {"start": "18:00"}}
    program_dict["steps"]["leave"]["timing"] = {
        "relative_to": {"step": "wake", "start_offset": "72h"}
    }
    for step in program_dict["steps"].values():
        step["days"] = ["sun"]
    p = validate_program(program_dict)
    current = preview_calendar_dates(p, [date(2026, 10, 14)], 0, context=CTX)[0]
    assert {e.source_id for e in current.events} == {"leave"}
    assert all(e.at == datetime(2026, 10, 14, 18, tzinfo=UTC) for e in current.events)
    program_dict["steps"]["leave"]["timing"]["relative_to"]["start_offset"] = "-96h"
    current = preview_calendar_dates(
        validate_program(program_dict), [date(2026, 10, 14)], 0, context=CTX
    )[0]
    assert {e.source_id for e in current.events} == {"leave"}


@pytest.mark.parametrize("day", [date(2026, 10, 14), date(2026, 3, 29), date(2026, 10, 25)])
def test_calendar_preview_preserves_overnight_chart_context_without_executing_it(day):
    from custom_components.occupied.planner import preview_calendar_dates
    from custom_components.occupied.storage import plan_from_data

    program = validate_program(
        {
            "schema_version": 1,
            "name": "Overnight preview",
            "steps": {
                "evening": {
                    "timing": {"absolute_time": {"start": "18:00"}},
                    "action": "turn_on",
                    "entities": ["light.a"],
                },
                "bedtime": {
                    "timing": {"absolute_time": {"start": "23:30", "end": "00:20"}},
                    "action": "turn_off",
                    "entities": ["light.a"],
                },
            },
        }
    )
    context = PlanningContext("Europe/Stockholm")
    single = preview_calendar_dates(program, [day], "preview-1", context=context)[0]
    together = preview_calendar_dates(
        program, [day - timedelta(days=1), day], "preview-1", context=context
    )[-1]
    assert single.to_dict() == together.to_dict()
    assert single.history_events
    assert all(single.start <= e.at < single.end for e in single.events)
    assert all(e.at < single.start for e in single.history_events)
    assert any(e.source_id == "evening" for e in single.history_events)
    restored = plan_from_data(single.to_dict())
    assert restored.to_dict() == single.to_dict()
    assert all(e.at >= single.start for group in restored.groups.values() for e in group)
