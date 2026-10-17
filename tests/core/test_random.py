"""Random windows share deterministic planning, typed actions, and editor semantics."""

from copy import deepcopy
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from custom_components.occupied.file_config import export_yaml, load_yaml
from custom_components.occupied.models import (
    controlled_entities,
    max_plan_events,
    projectable_lights,
)
from custom_components.occupied.plan_codec import plan_from_data
from custom_components.occupied.planner import generate_plan, preview_calendar_dates, preview_dates
from custom_components.occupied.runtime_planning import runtime_dates
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


def test_duration_window_ranges_roundtrip_and_follow_the_sampled_start(random_program):
    event = random_program["random"]["living"]
    event["start"]["absolute_time"]["end"] = "18:30"
    event["end"] = {"duration": {"min": "30m", "max": "90m"}}
    program = validate_program(random_program)
    assert program_data(load_yaml(export_yaml(program))) == program_data(program)
    for seed in range(10):
        plan = planned(random_program, seed=seed)
        assert plan.feasible
        assert plan == planned(random_program, seed=seed)
        assert all(
            datetime(2026, 10, 13, 18, tzinfo=UTC) <= e.at <= datetime(2026, 10, 13, 20, tzinfo=UTC)
            for e in plan.events
        )
    event["end"] = {"duration": {"min": "1h", "max": "60m"}}
    assert program_data(validate_program(random_program))["random"]["living"]["end"] == {
        "duration": {"min": "1h"}
    }


def test_relative_random_start_uses_the_sampled_window_close_not_last_occurrence(
    random_program, monkeypatch
):
    import random

    monkeypatch.setattr(random.Random, "uniform", lambda self, low, high: (low + high) / 2)
    parent = random_program["random"].pop("living")
    parent.update(
        count=1,
        min_duration="5m",
        max_duration="5m",
        end={"absolute_time": {"start": "19:00", "end": "20:00"}},
    )
    random_program["random"]["z_parent"] = parent
    child = deepcopy(parent)
    child.update(
        start={"relative_to": {"random": "z_parent", "start_offset": "10m"}},
        end={"duration": {"min": "10m"}},
        min_duration="10m",
        max_duration="10m",
    )
    random_program["random"]["a_child"] = child
    plan = planned(random_program)
    assert plan.feasible
    parent_events = [e for e in plan.events if e.source_id == "z_parent"]
    child_starts = [e for e in plan.events if e.source_id == "a_child" and e.kind == "random_start"]
    child_ends = [e for e in plan.events if e.source_id == "a_child" and e.kind == "random_end"]
    assert max(e.at for e in parent_events) < datetime(2026, 10, 13, 19, 30, tzinfo=UTC)
    assert {e.at for e in child_starts} == {datetime(2026, 10, 13, 19, 40, tzinfo=UTC)}
    assert {e.at for e in child_ends} == {datetime(2026, 10, 13, 19, 50, tzinfo=UTC)}


@pytest.mark.parametrize("disabled", [True, False])
def test_dependent_random_windows_skip_when_the_parent_does_not_run(random_program, disabled):
    parent = random_program["random"]["living"]
    child = deepcopy(parent)
    child.update(start={"relative_to": {"random": "living"}}, end={"duration": {"min": "1h"}})
    random_program["random"]["child"] = child
    parent["enabled"] = not disabled
    if not disabled:
        parent["days"] = ["mon"]
    plan = planned(random_program)
    assert plan.feasible and not plan.events
    assert any(
        issue.code == "anchor_skipped" and issue.path == ("random", "child", "start", "relative_to")
        for issue in plan.issues
    )


def test_random_dependencies_validate_cycles_dangling_refs_and_renames(random_program):
    parent = random_program["random"]["living"]
    child = deepcopy(parent)
    child["start"] = {"relative_to": {"random": "living"}}
    child["end"] = {"duration": {"min": "1h"}}
    random_program["random"]["child"] = child
    renamed = rename_identifier(validate_program(random_program), "random", "living", "parent")
    assert renamed.random["child"].start.relative_to.random == "parent"
    assert generate_plan(renamed, DAY, "random-proof", context=CTX).feasible
    child["start"]["relative_to"]["random"] = "missing"
    with pytest.raises(ProgramError) as raised:
        validate_program(random_program)
    assert raised.value.issues[0].path == ("random", "child", "start", "relative_to", "random")
    child["start"]["relative_to"]["random"] = "living"
    parent["start"] = {"relative_to": {"random": "child"}}
    with pytest.raises(ProgramError, match="Cyclic random"):
        validate_program(random_program)
    parent["start"] = {"relative_to": {"random": "living"}}
    with pytest.raises(ProgramError, match="Cyclic random"):
        validate_program(random_program)


def test_window_duration_and_random_reference_modes_are_scoped_and_bounded(random_program):
    event = random_program["random"]["living"]
    event["end"] = {"duration": {"min": "2h", "max": "1h"}}
    with pytest.raises(ProgramError) as raised:
        validate_program(random_program)
    assert raised.value.issues[0].path == ("random", "living", "end", "duration", "max")
    event["end"] = {"duration": {"min": "0s"}}
    with pytest.raises(ProgramError):
        validate_program(random_program)
    event["end"] = {"relative_to": {"random": "living"}}
    with pytest.raises(ProgramError, match="only supported for a window start"):
        validate_program(random_program)
    event["end"] = {"duration": {"min": "1h"}}
    event["start"] = {"duration": {"min": "1h"}}
    with pytest.raises(ProgramError, match="only supported for a random window end"):
        validate_program(random_program)


def test_duration_chains_are_included_in_the_bounded_runtime_horizon(random_program):
    parent = random_program["random"]["living"]
    parent["end"] = {"duration": {"min": "7h"}}
    child = deepcopy(parent)
    child["start"] = {"relative_to": {"random": "living", "start_offset": "48h"}}
    child["end"] = {"duration": {"min": "48h"}}
    random_program["random"]["child"] = child
    dates = runtime_dates(validate_program(random_program), DAY)
    assert DAY - timedelta(days=6) in dates
    child["start"]["relative_to"]["start_offset"] = "168h"
    child["end"] = {"duration": {"min": "168h"}}
    with pytest.raises(ProgramError, match="planning horizon"):
        runtime_dates(validate_program(random_program), DAY)


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


@pytest.mark.parametrize("minimum,maximum", [(2, 6), (0, 6), (0, 1)])
def test_count_ranges_sample_both_bounds_and_repeat_per_window(random_program, minimum, maximum):
    random_program["random"]["living"]["count"] = {"min": minimum, "max": maximum}
    program = validate_program(random_program)
    assert max_plan_events(program) == maximum * 4
    counts = set()
    for offset in range(40):
        day = DAY + timedelta(days=offset)
        plan = preview_dates(program, [day], "random-proof", context=CTX)[0]
        count = len(plan.events) // 4
        counts.add(count)
        assert plan.feasible and minimum <= count <= maximum
        assert len({e.id for e in plan.events}) == count * 4
        assert plan == planned(random_program, seed=plan.seed, day=day)
        assert plan_from_data(plan.to_dict()) == plan
        assert all(
            datetime.combine(day, datetime.min.time(), UTC) + timedelta(hours=18)
            <= e.at
            <= datetime.combine(day, datetime.min.time(), UTC) + timedelta(hours=23)
            for e in plan.events
        )
    assert counts == set(range(minimum, maximum + 1))


@pytest.mark.parametrize("minimum", [0, 2])
def test_count_sampling_is_independent_of_metadata_and_other_events(random_program, minimum):
    event = random_program["random"]["living"]
    event["count"] = {"min": minimum, "max": 6}
    first = planned(random_program)
    event["name"] = "Renamed"
    random_program["random"]["another"] = deepcopy(event)
    random_program["random"] = dict(reversed(random_program["random"].items()))
    assert (
        tuple(e for e in planned(random_program).events if e.source_id == "living") == first.events
    )
    # Count sampling must not move the existing occurrences' time/duration streams.
    event["count"] = 6
    expanded = {e.id: e for e in planned(random_program).events}
    assert all(expanded[e.id] == e for e in first.events)


@pytest.mark.parametrize("count", [0, 5])
def test_equal_count_bounds_preserve_fixed_count_identity_and_plans(random_program, count):
    random_program["random"]["living"]["count"] = count
    fixed = validate_program(random_program)
    first = planned(random_program)
    random_program["random"]["living"]["count"] = {"min": count, "max": count}
    equal = validate_program(random_program)
    assert program_data(equal) == program_data(fixed)
    assert behavior_hash(equal) == behavior_hash(fixed)
    assert planned(random_program) == first


@pytest.mark.parametrize("count", [0, {"min": 0, "max": 0}])
@pytest.mark.parametrize("window", ["valid", "too_short", "zero_length", "unavailable"])
def test_zero_count_skips_without_resolving_the_window(random_program, count, window):
    event = random_program["random"]["living"]
    event["count"] = count
    if window == "too_short":
        event["end"] = {"duration": {"min": "1m"}}
    elif window == "zero_length":
        event["end"] = deepcopy(event["start"])
    elif window == "unavailable":
        event["start"] = {"relative_to": {"entity": "sensor.missing_time"}}
    program = validate_program(random_program)
    assert program_data(load_yaml(export_yaml(program))) == program_data(program)
    assert program_data(program)["random"]["living"]["count"] == 0
    assert max_plan_events(program) == 0
    plan = planned(random_program)
    assert plan.feasible and not plan.events
    assert plan == planned(random_program)
    assert plan_from_data(plan.to_dict()) == plan
    assert len(plan.issues) == 1
    assert plan.issues[0].code == "random_skipped"
    assert plan.issues[0].severity == "info"
    assert plan.issues[0].path == ("random", "living", "count")


def test_zero_sample_skips_dependent_chains_and_positive_samples_keep_closing_anchors(
    random_program,
):
    parent = random_program["random"]["living"]
    parent["count"] = {"min": 0, "max": 1}
    child = deepcopy(parent)
    child.update(
        count=1,
        start={"relative_to": {"random": "living", "start_offset": "10m"}},
        end={"duration": {"min": "10m"}},
        min_duration="10m",
        max_duration="10m",
    )
    grandchild = deepcopy(child)
    grandchild["start"]["relative_to"]["random"] = "child"
    random_program["random"].update(child=child, grandchild=grandchild)
    program = validate_program(random_program)
    outcomes = set()
    for offset in range(20):
        day = DAY + timedelta(days=offset)
        plan = preview_dates(program, [day], "zero-dependent-proof", context=CTX)[0]
        assert plan.feasible
        assert plan == planned(random_program, seed=plan.seed, day=day)
        active = bool(plan.events)
        outcomes.add(active)
        if not active:
            assert [(issue.code, issue.path) for issue in plan.issues] == [
                ("random_skipped", ("random", "living", "count")),
                ("anchor_skipped", ("random", "child", "start", "relative_to")),
                ("anchor_skipped", ("random", "grandchild", "start", "relative_to")),
            ]
            assert all(issue.severity == "info" for issue in plan.issues)
        else:
            assert not plan.issues
            assert {event.source_id for event in plan.events} == {"living", "child", "grandchild"}
            closing = datetime.combine(day, datetime.min.time(), UTC) + timedelta(hours=23)
            for key, minutes in (("child", 10), ("grandchild", 30)):
                assert {
                    event.at
                    for event in plan.events
                    if event.source_id == key and event.kind == "random_start"
                } == {closing + timedelta(minutes=minutes)}
    assert outcomes == {False, True}


def test_zero_samples_skip_infeasible_windows_but_positive_samples_still_fail(random_program):
    event = random_program["random"]["living"]
    event.update(count={"min": 0, "max": 1}, end={"duration": {"min": "1m"}})
    outcomes = set()
    for seed in range(20):
        plan = planned(random_program, seed=seed)
        assert not plan.events
        assert plan == planned(random_program, seed=seed)
        outcomes.add(plan.feasible)
        assert len(plan.issues) == 1
        if plan.feasible:
            assert plan.issues[0].code == "random_skipped"
            assert plan.issues[0].severity == "info"
        else:
            assert plan.issues[0].code == "random_window"
            assert plan.issues[0].severity == "error"
            assert plan.issues[0].path == ("random", "living", "min_duration")
    assert outcomes == {False, True}


def test_zero_count_windows_and_dependents_do_not_expand_the_runtime_horizon(random_program):
    parent = random_program["random"]["living"]
    parent.update(count=0, end={"duration": {"min": "168h"}})
    child = deepcopy(parent)
    child.update(
        count=1,
        start={"relative_to": {"random": "living", "start_offset": "168h"}},
    )
    random_program["random"]["child"] = child
    assert runtime_dates(validate_program(random_program), DAY) == [
        DAY - timedelta(days=1),
        DAY,
        DAY + timedelta(days=1),
    ]
    parent["count"] = {"min": 0, "max": 1}
    with pytest.raises(ProgramError) as raised:
        runtime_dates(validate_program(random_program), DAY)
    assert raised.value.issues[0].code == "runtime_budget"


@pytest.mark.parametrize(
    "count,field",
    [
        ({"min": -1, "max": 6}, "min"),
        ({"min": 0, "max": -1}, "max"),
        ({"min": True, "max": 6}, "min"),
        ({"min": 1.5, "max": 6}, "min"),
        ({"min": "2", "max": 6}, "min"),
        ({"min": 2, "max": 1001}, "max"),
        ({"min": 2, "max": False}, "max"),
        ({"min": 2, "max": 2.5}, "max"),
        ({"min": 6, "max": 2}, "max"),
        ({"max": 6}, "min"),
        ({"min": 2}, "max"),
        ({"min": 2, "max": 6, "extra": 1}, "extra"),
    ],
)
def test_invalid_count_ranges_have_editable_paths(random_program, count, field):
    random_program["random"]["living"]["count"] = count
    with pytest.raises(ProgramError) as raised:
        validate_program(random_program)
    assert raised.value.issues[0].path == ("random", "living", "count", field)


@pytest.mark.parametrize("minimum", [0, 2])
def test_count_range_yaml_roundtrip_and_maximum_runtime_budget(random_program, minimum):
    event = random_program["random"]["living"]
    event["count"] = {"min": minimum, "max": 6}
    program = validate_program(random_program)
    exported = export_yaml(program)
    assert program_data(load_yaml(exported)) == program_data(program)
    assert export_yaml(load_yaml(exported)) == exported
    assert planned(program_data(load_yaml(exported))) == planned(random_program)
    event["count"] = {"min": minimum, "max": 1000}
    event["on"]["entities"] = [f"light.a_{i}" for i in range(30)]
    event["off"]["entities"] = event["on"]["entities"]
    with pytest.raises(ProgramError):
        runtime_dates(validate_program(random_program), DAY)
    with pytest.raises(ProgramError):
        planned(random_program)


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


@pytest.mark.parametrize("count", [5, {"min": 5, "max": 10}])
def test_duration_limits_take_priority_over_event_count(random_program, count):
    event = random_program["random"]["living"]
    event.update(
        end={"absolute_time": {"start": "18:30"}},
        min_duration="20m",
        max_duration="25m",
        count=count,
    )
    plan = planned(random_program)
    assert plan.feasible
    starts = {
        e.sequence // 2: e
        for e in plan.events
        if e.kind == "random_start" and e.action.targets == ("light.a",)
    }
    ends = {
        e.sequence // 2: e
        for e in plan.events
        if e.kind == "random_end" and e.action.targets == ("light.a",)
    }
    assert len(starts) == 5 if isinstance(count, int) else 5 <= len(starts) <= 10
    assert starts.keys() == ends.keys()
    for occurrence, start in starts.items():
        end = ends[occurrence]
        assert timedelta(minutes=20) <= end.at - start.at <= timedelta(minutes=25)
        assert datetime(2026, 10, 13, 18, tzinfo=UTC) <= start.at
        assert end.at <= datetime(2026, 10, 13, 18, 30, tzinfo=UTC)
    # The count cannot be accommodated sequentially. Events overlap instead of
    # compressing their durations below the configured minimum.
    assert len(starts) * timedelta(minutes=20) > timedelta(minutes=30)
    assert max(e.at for e in starts.values()) < min(e.at for e in ends.values())


@pytest.mark.parametrize("count", [1, 5, {"min": 5, "max": 10}])
def test_impossible_minimum_duration_is_not_shortened_to_meet_count(random_program, count):
    event = random_program["random"]["living"]
    event.update(
        end={"absolute_time": {"start": "18:04"}},
        min_duration="5m",
        max_duration="15m",
        count=count,
    )
    plan = planned(random_program)
    assert not plan.feasible
    assert not plan.events
    assert len(plan.issues) == 1
    assert plan.issues[0].path == ("random", "living", "min_duration")
    assert plan.issues[0].message == "Minimum duration does not fit inside this window"


@pytest.mark.parametrize(
    "field,value",
    [
        ("count", True),
        ("count", -1),
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
