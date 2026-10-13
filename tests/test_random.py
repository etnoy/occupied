"""Random windows share deterministic planning, typed actions, and editor semantics."""

from copy import deepcopy
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from custom_components.occupied.file_config import export_yaml, load_yaml
from custom_components.occupied.models import controlled_entities, projectable_lights
from custom_components.occupied.planner import generate_plan, preview_calendar_dates
from custom_components.occupied.runtime_planning import runtime_dates
from custom_components.occupied.storage import plan_from_data
from custom_components.occupied.time_sources import source_entities
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import (
    ProgramError,
    behavior_hash,
    program_data,
    program_revision,
    rename_identifier,
    validate_program,
)

DAY = date(2026, 10, 13)
CTX = PlanningContext("UTC", 59.3, 18.1)


@pytest.fixture
def random_program():
    return {
        "schema_version": 1,
        "name": "Random house",
        "random": {
            "living": {
                "start": {"absolute_time": {"start": "18:00"}},
                "end": {"absolute_time": {"start": "23:00"}},
                "min_duration": "5m",
                "max_duration": "15m",
                "count": 5,
                "on": {"action": "turn_on", "entities": ["light.a", "switch.b"]},
                "off": {"action": "turn_off", "entities": ["light.a", "switch.b"]},
            }
        },
    }


def planned(data, seed="random-proof", day=DAY, context=CTX):
    return generate_plan(validate_program(data), day, seed, context=context)


def test_random_count_durations_bounds_and_cache_roundtrip(random_program):
    plan = planned(random_program)
    assert plan.feasible and len(plan.events) == 20
    assert plan_from_data(plan.to_dict()) == plan
    assert len({event.id for event in plan.events}) == len(plan.events)
    for entity in ("light.a", "switch.b"):
        for occurrence in range(5):
            events = [
                event
                for event in plan.events
                if event.action.targets == (entity,) and event.sequence // 2 == occurrence
            ]
            start, end = sorted(events, key=lambda event: event.at)
            assert start.kind == "random_start" and end.kind == "random_end"
            assert start.at >= datetime(2026, 10, 13, 18, tzinfo=UTC)
            assert end.at <= datetime(2026, 10, 13, 23, tzinfo=UTC)
            assert timedelta(minutes=5) <= end.at - start.at <= timedelta(minutes=15)
    assert planned(random_program) == plan
    assert planned(random_program, seed="another").events != plan.events


def test_metadata_order_and_unrelated_items_preserve_sampling(random_program, program_dict):
    original = validate_program(random_program)
    first = planned(random_program)
    random_program["name"] = "Renamed house"
    random_program["random"]["living"]["name"] = "Living room"
    renamed = validate_program(random_program)
    assert behavior_hash(renamed) == behavior_hash(original)
    assert program_revision(renamed) != program_revision(original)
    assert planned(random_program).events == first.events
    random_program["steps"] = program_dict["steps"]
    random_program["random"]["unrelated"] = deepcopy(random_program["random"]["living"])
    random_program["random"] = dict(reversed(random_program["random"].items()))
    assert (
        tuple(e for e in planned(random_program).events if e.source_id == "living") == first.events
    )


def test_fixed_duration_whole_window_and_overlapping_occurrences(random_program):
    event = random_program["random"]["living"]
    event.update(min_duration="5h", max_duration="5h")
    plan = planned(random_program)
    assert plan.feasible and len(plan.events) == 20
    assert {e.at for e in plan.events if e.kind == "random_start"} == {
        datetime(2026, 10, 13, 18, tzinfo=UTC)
    }
    assert {e.at for e in plan.events if e.kind == "random_end"} == {
        datetime(2026, 10, 13, 23, tzinfo=UTC)
    }


def test_maximum_duration_is_bounded_by_window(random_program):
    event = random_program["random"]["living"]
    event.update(min_duration="4h", max_duration="7h", count=100)
    plan = planned(random_program)
    assert plan.feasible
    assert all(
        datetime(2026, 10, 13, 18, tzinfo=UTC) <= e.at <= datetime(2026, 10, 13, 23, tzinfo=UTC)
        for e in plan.events
    )
    event["min_duration"] = "6h"
    infeasible = planned(random_program)
    assert not infeasible.feasible and not infeasible.events
    assert infeasible.issues[0].path == ("random", "living", "min_duration")


@pytest.mark.parametrize(
    "field,value",
    [
        ("count", True),
        ("count", 0),
        ("count", 1.5),
        ("count", 1001),
        ("min_duration", "0s"),
        ("min_duration", "-1m"),
        ("min_duration", 60),
        ("max_duration", "4m"),
        ("max_duration", "169h"),
        ("days", []),
        ("enabled", 1),
    ],
)
def test_invalid_random_fields_have_editable_paths(random_program, field, value):
    random_program["random"]["living"][field] = value
    with pytest.raises(ProgramError) as raised:
        validate_program(random_program)
    assert raised.value.issues[0].path == ("random", "living", field)


def test_both_actions_use_existing_validation_and_entity_derivation(random_program):
    event = random_program["random"]["living"]
    event["off"] = {"action": "scene.turn_on", "entities": ["scene.bedtime"]}
    program = validate_program(random_program)
    assert controlled_entities(program) == {"light.a", "switch.b", "scene.bedtime"}
    assert projectable_lights(program) == {"light.a"}
    assert len(planned(random_program).events) == 15
    assert {e.action.action for e in planned(random_program).events if e.kind == "random_end"} == {
        "scene.turn_on"
    }
    event["on"]["entities"] = ["scene.invalid"]
    with pytest.raises(ProgramError) as raised:
        validate_program(random_program)
    assert raised.value.issues[0].path == ("random", "living", "on", "entities")
    event["on"] = {
        "action": "light.turn_on",
        "entities": ["light.a"],
        "data": {"brightness_pct": 101},
    }
    with pytest.raises(ProgramError) as raised:
        validate_program(random_program)
    assert raised.value.issues[0].path == ("random", "living", "on", "data")


def test_step_boundaries_follow_samples_rename_and_skip(random_program, program_dict):
    random_program["steps"] = program_dict["steps"]
    event = random_program["random"]["living"]
    event["start"] = {"relative_to": {"step": "wake"}}
    event["end"] = {"relative_to": {"step": "leave"}}
    plan = planned(random_program)
    assert all(
        plan.step_times["wake"] <= e.at <= plan.step_times["leave"]
        for e in plan.events
        if e.kind.startswith("random_")
    )
    renamed = rename_identifier(validate_program(random_program), "step", "wake", "morning")
    assert renamed.random["living"].start.relative_to.step == "morning"
    renamed = rename_identifier(renamed, "step", "leave", "bedtime")
    assert renamed.random["living"].end.relative_to.step == "bedtime"
    assert "new" in rename_identifier(renamed, "random", "living", "new").random
    random_program["steps"]["wake"]["enabled"] = False
    skipped = planned(random_program)
    assert not skipped.events and any(i.code == "anchor_skipped" for i in skipped.issues)


def test_missing_boundary_step_is_rejected(random_program):
    random_program["random"]["living"]["end"] = {"relative_to": {"step": "unknown"}}
    with pytest.raises(ProgramError) as raised:
        validate_program(random_program)
    assert raised.value.issues[0].path == ("random", "living", "end", "relative_to", "step")


def test_disabled_and_weekdays_skip_random_activity(random_program):
    event = random_program["random"]["living"]
    event["days"] = ["mon"]
    assert not planned(random_program).events
    assert planned(random_program, day=date(2026, 10, 12)).events
    event["enabled"] = False
    program = validate_program(random_program)
    assert not controlled_entities(program) and not projectable_lights(program)
    assert not planned(random_program, day=date(2026, 10, 12)).events


@pytest.mark.parametrize("day,duration", [(date(2026, 3, 28), "4h"), (date(2026, 10, 24), "6h")])
def test_overnight_random_windows_use_local_dates_across_dst(random_program, day, duration):
    event = random_program["random"]["living"]
    event.update(
        start={"absolute_time": {"start": "23:00"}},
        end={"absolute_time": {"start": "04:00"}},
        min_duration=duration,
        max_duration=duration,
        count=1,
    )
    context = PlanningContext("Europe/Stockholm")
    plan = planned(random_program, day=day, context=context)
    assert plan.feasible
    starts = {
        e.at.astimezone(ZoneInfo(context.timezone)).isoformat()
        for e in plan.events
        if e.kind == "random_start"
    }
    assert len(starts) == 1 and next(iter(starts)).startswith(f"{day}T23:00:00")
    assert {e.at - plan.events[0].at for e in plan.events if e.kind == "random_end"} == {
        timedelta(hours=int(duration[:-1]))
    }
    following = preview_calendar_dates(
        validate_program(random_program), [day + timedelta(days=1)], "seed", context=context
    )[0]
    assert len([e for e in following.events if e.kind == "random_end"]) == 2


def test_solar_and_time_helper_boundaries_repeat_but_dated_sources_do_not(random_program):
    event = random_program["random"]["living"]
    event["start"] = {"relative_to": {"sun": "sunset"}}
    event["end"] = {"relative_to": {"sun": "sunrise"}}
    assert planned(random_program).feasible and planned(random_program).events
    event["start"] = {"relative_to": {"entity": "input_datetime.evening"}}
    event["end"] = {"relative_to": {"entity": "sensor.bedtime"}}
    program = validate_program(random_program)
    assert source_entities(program) == {"input_datetime.evening", "sensor.bedtime"}
    context = PlanningContext(
        "UTC",
        time_sources={
            "input_datetime.evening": {"kind": "time", "state": "18:00"},
            "sensor.bedtime": {"kind": "timestamp", "state": "2026-10-13T23:00:00Z"},
        },
    )
    assert planned(random_program, context=context).events
    assert not planned(random_program, day=DAY + timedelta(days=1), context=context).events
    assert not planned(random_program).events


def test_random_roundtrip_and_bounded_runtime_budget(random_program):
    program = validate_program(random_program)
    exported = export_yaml(program)
    assert program_data(load_yaml(exported)) == program_data(program)
    assert export_yaml(load_yaml(exported)) == exported
    event = random_program["random"]["living"]
    event["count"] = 1000
    event["on"]["entities"] = [f"light.a_{i}" for i in range(30)]
    event["off"]["entities"] = event["on"]["entities"]
    with pytest.raises(ProgramError):
        runtime_dates(validate_program(random_program), DAY)
    with pytest.raises(ProgramError):
        planned(random_program)
