"""Date/time, stable random draws, interval constraints, and resource coordination."""

from copy import deepcopy
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from astral import Observer
from astral.sun import sunset

from custom_components.occupied.planner import generate_plan, preview_dates
from custom_components.occupied.time_utils import PlanningContext, simulation_date_at
from custom_components.occupied.validation import ProgramError, validate_program


def test_many_seeds_obey_clock_relative_duration_count_and_gap_bounds(program_dict):
    program = validate_program(program_dict)
    wake_times = set()
    for seed in range(200):
        plan = generate_plan(program, date(2026, 10, 6), seed)
        assert plan.feasible
        wake, leave = plan.step_times["wake"], plan.step_times["leave"]
        wake_times.add(wake)
        assert (
            datetime(2026, 10, 6, 6, 40, tzinfo=UTC)
            <= wake
            <= datetime(2026, 10, 6, 7, 20, tzinfo=UTC)
        )
        assert 1800 <= (leave - wake).total_seconds() <= 2700
        activity = next(item for item in plan.intervals if item.kind == "activity")
        assert (activity.end - activity.start_complete).total_seconds() == 2700
        assert (
            datetime(2026, 10, 6, 19, 45, tzinfo=UTC)
            <= activity.start
            <= datetime(2026, 10, 6, 20, 15, tzinfo=UTC)
        )
        windows = [item for item in plan.intervals if item.kind == "window"]
        assert 2 <= len(windows) <= 4
        for interval in windows:
            assert (
                datetime(2026, 10, 6, 8, tzinfo=UTC)
                <= interval.start
                < interval.end
                <= datetime(2026, 10, 6, 12, tzinfo=UTC)
            )
            assert 300 - 1e-6 <= (interval.end - interval.start).total_seconds() <= 1200 + 1e-6
        for first, second in zip(windows, windows[1:], strict=False):
            assert (second.start - first.end).total_seconds() >= 600 - 1e-6
    assert len(wake_times) > 100


def test_renames_reordering_and_unrelated_rules_preserve_draws(program_dict):
    original = generate_plan(validate_program(program_dict), date(2026, 10, 6), "stable")
    edited = deepcopy(program_dict)
    edited["name"] = "Renamed"
    edited["groups"][0]["entities"].reverse()
    edited["routines"][0]["steps"].reverse()
    for step in edited["routines"][0]["steps"]:
        step["name"] += " new"
    reordered = generate_plan(validate_program(edited), date(2026, 10, 6), "stable")
    assert original.behavior_hash == reordered.behavior_hash
    assert original.events == reordered.events
    assert original.intervals == reordered.intervals
    edited["routines"][0]["steps"].append(
        {
            "id": "unrelated",
            "name": "Unrelated",
            "when": {"clock_range": {"earliest": "16:00", "latest": "18:00"}},
            "actions": [{"action": "turn_on", "targets": {"entities": ["switch.other"]}}],
        }
    )
    extended = generate_plan(validate_program(edited), date(2026, 10, 6), "stable")
    assert all(extended.step_times[key] == value for key, value in original.step_times.items())
    assert original.intervals == extended.intervals


def test_week_preview_matches_individual_dates_and_weekdays(program_dict):
    program_dict["routines"][0]["days"] = ["mon", "tue", "wed", "thu", "fri"]
    program = validate_program(program_dict)
    dates = [date(2026, 10, 5) + timedelta(days=index) for index in range(7)]
    week = preview_dates(program, dates, 7)
    assert [bool(plan.events) for plan in week] == [True] * 5 + [False] * 2
    assert week[2] == preview_dates(program, [dates[2]], 7)[0]


def test_skipped_parent_suppresses_dependents_and_windows(program_dict):
    program_dict["routines"][0]["steps"][0]["probability"] = 0
    program_dict["routines"][0]["activity_windows"][0]["between"]["start"] = {"step": "leave"}
    plan = generate_plan(validate_program(program_dict), date(2026, 10, 6), 0)
    assert not plan.step_times
    assert not any(interval.kind == "window" for interval in plan.intervals)
    assert any(issue.code == "anchor_skipped" for issue in plan.issues)


def test_solar_times_use_requested_date_and_offsets(program_dict):
    program_dict["timezone"] = "Europe/Stockholm"
    program_dict["location"] = {"latitude": 59.3293, "longitude": 18.0686}
    program_dict["routines"][0]["steps"][0]["when"] = {
        "sun_range": {"sun": "sunset", "offset_range": {"min": "-30m", "max": "30m"}}
    }
    program = validate_program(program_dict)
    for day in (date(2026, 1, 6), date(2026, 7, 6)):
        plan = generate_plan(program, day, 42)
        anchor = sunset(Observer(59.3293, 18.0686), date=day, tzinfo=ZoneInfo("Europe/Stockholm"))
        assert abs((plan.step_times["wake"] - anchor).total_seconds()) <= 1800


def test_polar_sun_is_skipped_or_uses_explicit_fallback(program_dict):
    program_dict["location"] = {"latitude": 78.2232, "longitude": 15.6469}
    program_dict["routines"][0]["steps"][0]["when"] = {
        "sun_range": {"sun": "sunset", "offset_range": {"fixed": "0s"}}
    }
    plan = generate_plan(validate_program(program_dict), date(2026, 6, 20), 0)
    assert "wake" not in plan.step_times
    assert any(issue.code == "sun_unavailable" for issue in plan.issues)
    program_dict["routines"][0]["steps"][0]["when"]["sun_range"]["fallback"] = "18:00"
    plan = generate_plan(validate_program(program_dict), date(2026, 6, 20), 0)
    assert plan.step_times["wake"] == datetime(2026, 6, 20, 18, tzinfo=UTC)
    assert any(issue.code == "sun_fallback" for issue in plan.issues)


def test_dst_gap_and_repeat_choose_contract_instants(program_dict):
    program_dict["timezone"] = "Europe/Stockholm"
    program_dict["routines"][0]["steps"][0]["when"] = {
        "clock_range": {"earliest": "02:30", "latest": "02:30"}
    }
    program = validate_program(program_dict)
    spring = generate_plan(program, date(2026, 3, 29), 0)
    assert spring.step_times["wake"] == datetime(2026, 3, 29, 1, tzinfo=UTC)
    assert (spring.end - spring.start).total_seconds() == 23 * 3600
    assert any(issue.code == "dst_gap" for issue in spring.issues)
    autumn = generate_plan(program, date(2026, 10, 25), 0)
    assert autumn.step_times["wake"] == datetime(2026, 10, 25, 0, 30, tzinfo=UTC)
    assert (autumn.end - autumn.start).total_seconds() == 25 * 3600


def test_midnight_chains_retain_simulation_date(program_dict):
    routine = program_dict["routines"][0]
    routine["steps"][0]["when"] = {"clock_range": {"earliest": "23:50", "latest": "23:50"}}
    routine["steps"][1]["when"]["offset_range"] = {"fixed": "20m"}
    routine["activity_windows"][0]["between"] = {
        "start": {"clock": "23:00"},
        "end": {"clock": "01:00"},
        "cross_midnight": True,
    }
    plan = generate_plan(validate_program(program_dict), date(2026, 10, 6), 0)
    assert plan.step_times["leave"] == datetime(2026, 10, 7, 0, 10, tzinfo=UTC)
    assert plan.end == datetime(2026, 10, 7, 2, tzinfo=UTC)
    assert plan.feasible
    assert simulation_date_at(
        validate_program(program_dict), datetime(2026, 10, 7, 1, tzinfo=UTC), PlanningContext()
    ) == date(2026, 10, 6)


def test_missing_cross_midnight_and_post_dst_window_order_are_reported(program_dict):
    program_dict["routines"][0]["activity_windows"][0]["between"] = {
        "start": {"clock": "23:00"},
        "end": {"clock": "01:00"},
    }
    plan = generate_plan(validate_program(program_dict), date(2026, 10, 6), 0)
    assert any(issue.code == "cross_midnight" for issue in plan.issues)
    program_dict["timezone"] = "Europe/Stockholm"
    program_dict["routines"][0]["activity_windows"][0]["between"] = {
        "start": {"clock": "02:30"},
        "end": {"clock": "02:45"},
    }
    plan = generate_plan(validate_program(program_dict), date(2026, 3, 29), 0)
    assert any(issue.code == "window_order" for issue in plan.issues)


def test_conditioned_durations_fit_tight_window_without_reducing_count(program_dict):
    window = program_dict["routines"][0]["activity_windows"][0]
    window.update(
        {
            "cycles": {"fixed": 2},
            "between": {"start": {"clock": "08:00"}, "end": {"clock": "08:20"}},
            "min_gap": "2m",
        }
    )
    program = validate_program(program_dict)
    for seed in range(100):
        plan = generate_plan(program, date(2026, 10, 6), seed)
        assert plan.feasible
        intervals = [item for item in plan.intervals if item.kind == "window"]
        assert len(intervals) == 2
        assert sum(interval.duration for interval in intervals) <= 18 * 60 + 1e-6
        assert all(interval.duration >= 300 - 1e-6 for interval in intervals)


def test_infeasible_count_is_reported_without_partial_intervals(program_dict):
    window = program_dict["routines"][0]["activity_windows"][0]
    window.update(
        {
            "cycles": {"fixed": 4},
            "between": {"start": {"clock": "08:00"}, "end": {"clock": "08:10"}},
        }
    )
    plan = generate_plan(validate_program(program_dict), date(2026, 10, 6), 0)
    assert not plan.feasible
    assert not any(item.kind == "window" for item in plan.intervals)
    assert any(issue.code == "window_infeasible" for issue in plan.issues)


def test_subset_weights_and_local_overlap_limit(program_dict):
    window = program_dict["routines"][0]["activity_windows"][0]
    window.update(
        {
            "target_mode": "weighted_subset",
            "subset_size": {"fixed": 1},
            "weights": {"light.a": 1000, "light.b": 1},
            "overlap": True,
            "min_gap": "0s",
            "max_simultaneous": 1,
        }
    )
    program = validate_program(program_dict)
    for seed in range(30):
        plan = generate_plan(program, date(2026, 10, 6), seed)
        assert plan.feasible
        windows = [item for item in plan.intervals if item.kind == "window"]
        assert all(len(item.resources) == 1 for item in windows)
        assert sum(item.resources == ("light.a",) for item in windows) >= len(windows) - 1
        for previous, current in zip(windows, windows[1:], strict=False):
            assert previous.end <= current.start


def test_exclusive_timed_resources_and_enclosing_duration_fit(program_dict):
    activity = program_dict["routines"][0]["activities"][0]
    activity["when"] = {"clock_range": {"earliest": "20:00", "latest": "20:00"}}
    other = deepcopy(activity)
    other["id"] = "tv_2"
    program_dict["routines"][0]["activities"].append(other)
    plan = generate_plan(validate_program(program_dict), date(2026, 10, 6), 0)
    assert len([item for item in plan.intervals if item.kind == "activity"]) == 1
    assert any(issue.code == "activity_infeasible" for issue in plan.issues)
    program_dict["routines"][0]["activities"] = [activity]
    activity["within"] = {"start": {"clock": "19:00"}, "end": {"clock": "20:30"}}
    plan = generate_plan(validate_program(program_dict), date(2026, 10, 6), 0)
    assert not any(item.kind == "activity" for item in plan.intervals)


def test_endings_precede_same_priority_starts_at_same_instant(program_dict):
    window = program_dict["routines"][0]["activity_windows"][0]
    window.update(
        {
            "cycles": {"fixed": 2},
            "on_duration": {"fixed": "10m"},
            "min_gap": "0s",
            "between": {"start": {"clock": "08:00"}, "end": {"clock": "08:20"}},
        }
    )
    plan = generate_plan(validate_program(program_dict), date(2026, 10, 6), 0)
    instant = datetime(2026, 10, 6, 8, 10, tzinfo=UTC)
    events = [event.kind for event in plan.events if event.at == instant]
    assert events == ["window_end", "window_end", "window_start", "window_start"]


def test_global_group_concurrency_uses_bounded_reported_failure(program_dict):
    program_dict["groups"].append({"id": "other", "name": "Other", "entities": ["light.other"]})
    program_dict["constraints"] = {"max_simultaneous_groups": 1, "generation_attempts": 3}
    window = program_dict["routines"][0]["activity_windows"][0]
    window.update(
        {
            "cycles": {"fixed": 1},
            "on_duration": {"fixed": "1h"},
            "between": {"start": {"clock": "08:00"}, "end": {"clock": "09:00"}},
        }
    )
    second = deepcopy(window)
    second.update({"id": "other_use", "targets": {"groups": ["other"]}})
    program_dict["routines"][0]["activity_windows"].append(second)
    plan = generate_plan(validate_program(program_dict), date(2026, 10, 6), 0)
    assert len([item for item in plan.intervals if item.kind == "window"]) == 1
    assert any(
        issue.code == "concurrency_infeasible" and "3 attempts" in issue.message
        for issue in plan.issues
    )


def test_home_assistant_timezone_needs_explicit_offline_context(program_dict):
    program_dict["timezone"] = "home_assistant"
    program = validate_program(program_dict)
    with pytest.raises(ProgramError):
        generate_plan(program, date(2026, 10, 6), 0)
    plan = generate_plan(program, date(2026, 10, 6), 0, context=PlanningContext("Europe/Stockholm"))
    assert plan.timezone == "Europe/Stockholm"


@pytest.mark.parametrize("second_start, feasible", [("20:46:30", False), ("20:47", True)])
def test_activity_duration_and_exclusive_lease_include_staggered_actions(
    program_dict, second_start, feasible
):
    activity = program_dict["routines"][0]["activities"][0]
    activity["when"] = {"clock_range": {"earliest": "20:00", "latest": "20:00"}}
    activity["resources"].append("remote.other")
    for field in ("on_start", "on_end"):
        activity[field][0]["targets"]["entities"].append("remote.other")
        activity[field][0]["stagger"] = {"fixed": "1m"}
    other = deepcopy(activity)
    other["id"] = "tv_2"
    other["when"] = {"clock_range": {"earliest": second_start, "latest": second_start}}
    program_dict["routines"][0]["activities"].append(other)
    plan = generate_plan(validate_program(program_dict), date(2026, 10, 6), 0)
    interval = next(item for item in plan.intervals if item.source_id == "tv")
    assert interval.start_complete == datetime(2026, 10, 6, 20, 1, tzinfo=UTC)
    assert interval.end == datetime(2026, 10, 6, 20, 46, tzinfo=UTC)
    assert interval.cleanup_complete == datetime(2026, 10, 6, 20, 47, tzinfo=UTC)
    assert (interval.end - interval.start_complete).total_seconds() == 45 * 60
    assert plan.feasible is feasible


@pytest.mark.parametrize("other_target, feasible", [("light.a", True), ("light.b", False)])
def test_subset_concurrency_counts_only_groups_with_selected_targets(
    program_dict, other_target, feasible
):
    program_dict["groups"][0]["entities"] = ["light.a"]
    program_dict["groups"].append({"id": "other", "name": "Other", "entities": ["light.b"]})
    program_dict["constraints"] = {"max_simultaneous_groups": 1, "generation_attempts": 2}
    window = program_dict["routines"][0]["activity_windows"][0]
    window.update(
        {
            "cycles": {"fixed": 1},
            "on_duration": {"fixed": "1h"},
            "between": {"start": {"clock": "08:00"}, "end": {"clock": "09:00"}},
            "targets": {"groups": ["room", "other"]},
            "target_mode": "one",
            "weights": {"light.a": 1e12, "light.b": 1},
        }
    )
    second = deepcopy(window)
    second["id"] = "second_use"
    second["weights"] = {other_target: 1e12}
    program_dict["routines"][0]["activity_windows"].append(second)
    plan = generate_plan(validate_program(program_dict), date(2026, 10, 6), 0)
    assert plan.feasible is feasible
    first = next(item for item in plan.intervals if item.source_id == "room_use")
    assert first.groups == ("room",)


@pytest.mark.parametrize("anchor", ["clock", "sun", "relative"])
def test_step_start_intervals_always_sample_uniformly(program_dict, anchor):
    from custom_components.occupied.planner import RandomStreams

    program_dict["location"] = {"latitude": 59.3293, "longitude": 18.0686}
    program_dict["defaults"] = {"time_distribution": "triangular"}
    routine = program_dict["routines"][0]
    routine["defaults"] = {"time_distribution": "triangular"}
    step = routine["steps"][1]
    step["time_distribution"] = "triangular"
    if anchor == "relative":
        step["when"] = {
            "relative_to": "wake",
            "offset_range": {"min": "-20m", "max": "-10s", "mode": "-15m"},
            "distribution": "triangular",
        }
    elif anchor == "sun":
        step["when"] = {
            "sun_range": {"sun": "sunrise", "offset_range": {"min": "10s", "max": "20m"}},
            "distribution": "triangular",
        }
    else:
        step["when"] = {
            "clock_range": {"earliest": "06:40:00", "latest": "07:20:00", "mode": "06:45"},
            "distribution": "triangular",
        }
    program = validate_program(program_dict)
    for seed in range(20):
        plan = generate_plan(program, date(2026, 10, 6), seed)
        rng = RandomStreams(seed).rng("step", step["id"], "start", 0)
        if anchor == "relative":
            expected = plan.step_times["wake"] + timedelta(seconds=rng.uniform(-1200, -10))
        elif anchor == "sun":
            from astral.sun import sunrise

            location = program.location
            sun = sunrise(
                Observer(location.latitude, location.longitude), date=date(2026, 10, 6), tzinfo=UTC
            )
            expected = datetime.fromtimestamp(
                rng.uniform(sun.timestamp() + 10, sun.timestamp() + 1200), UTC
            )
        else:
            expected = datetime.fromtimestamp(
                rng.uniform(
                    datetime(2026, 10, 6, 6, 40, tzinfo=UTC).timestamp(),
                    datetime(2026, 10, 6, 7, 20, tzinfo=UTC).timestamp(),
                ),
                UTC,
            )
        assert plan.step_times[step["id"]] == expected


def time_source_program():
    return {
        "schema_version": 1,
        "name": "Times",
        "timezone": "Europe/Stockholm",
        "routines": [
            {
                "id": "daily",
                "name": "Daily",
                "steps": [
                    {
                        "id": "run",
                        "name": "Run",
                        "allow_cross_boundary": True,
                        "when": {
                            "entity_range": {
                                "entity_id": "sensor.alarm",
                                "offset_range": {
                                    "min": "-30m",
                                    "max": "-10m",
                                },
                            }
                        },
                        "actions": [
                            {"action": "scene.turn_on", "targets": {"entities": ["scene.morning"]}}
                        ],
                    }
                ],
            }
        ],
    }


def test_timestamp_time_sources_apply_signed_uniform_offsets_only_on_reported_date():
    raw = time_source_program()
    program = validate_program(raw)
    context = PlanningContext(
        time_sources={
            "sensor.alarm": {
                "kind": "timestamp",
                "state": "2026-10-06T06:00:00+00:00",
            }
        }
    )
    times = set()
    for seed in range(50):
        plan = generate_plan(program, date(2026, 10, 6), seed, context=context)
        times.add(plan.step_times["run"])
        assert (
            datetime(2026, 10, 6, 5, 30, tzinfo=UTC)
            <= plan.step_times["run"]
            <= datetime(2026, 10, 6, 5, 50, tzinfo=UTC)
        )
    assert len(times) == 50
    other = generate_plan(program, date(2026, 10, 7), 1, context=context)
    assert not other.events
    assert any(issue.code == "time_source_other_date" for issue in other.issues)


def test_time_only_helper_repeats_and_calendar_local_time_uses_program_timezone():
    raw = time_source_program()
    spec = raw["routines"][0]["steps"][0]["when"]["entity_range"]
    spec.update(entity_id="input_datetime.wake", offset_range={"fixed": "0s"})
    context = PlanningContext(
        time_sources={"input_datetime.wake": {"kind": "time", "state": "08:00:00"}}
    )
    for day in (6, 7):
        plan = generate_plan(validate_program(raw), date(2026, 10, day), 1, context=context)
        assert plan.step_times["run"] == datetime(2026, 10, day, 6, tzinfo=UTC)
    spec.update(entity_id="calendar.work", attribute="start_time")
    context = PlanningContext(
        time_sources={"calendar.work": {"kind": "calendar", "start_time": "2026-10-06 08:00:00"}}
    )
    plan = generate_plan(validate_program(raw), date(2026, 10, 6), 1, context=context)
    assert plan.step_times["run"] == datetime(2026, 10, 6, 6, tzinfo=UTC)
    spec["attribute"] = "end_time"
    context = PlanningContext(
        time_sources={"calendar.work": {"kind": "calendar", "end_time": "2026-10-06 09:00:00"}}
    )
    plan = generate_plan(validate_program(raw), date(2026, 10, 6), 1, context=context)
    assert plan.step_times["run"] == datetime(2026, 10, 6, 7, tzinfo=UTC)


@pytest.mark.parametrize(
    "value", [None, "unknown", "unavailable", "invalid", "2026-10-06T08:00:00"]
)
def test_unavailable_or_invalid_time_source_skips_with_warning(value):
    context = PlanningContext(time_sources={"sensor.alarm": {"kind": "timestamp", "state": value}})
    plan = generate_plan(
        validate_program(time_source_program()), date(2026, 10, 6), 1, context=context
    )
    assert not plan.events
    assert any(issue.code == "time_source_unavailable" for issue in plan.issues)


@pytest.mark.parametrize("event", ["sunrise", "sunset", "dawn", "dusk", "noon", "midnight"])
def test_all_solar_events_are_resolved_for_each_preview_date(event):
    from astral import sun

    raw = time_source_program()
    raw["location"] = {"latitude": 59.3, "longitude": 18.1}
    raw["routines"][0]["steps"][0]["when"] = {"sun_range": {"sun": event}}
    for day in (6, 7):
        plan = generate_plan(validate_program(raw), date(2026, 10, day), 1)
        expected = getattr(sun, event)(
            Observer(59.3, 18.1), date=date(2026, 10, day), tzinfo=ZoneInfo("Europe/Stockholm")
        )
        assert plan.step_times["run"] == expected.astimezone(UTC)


def test_calendar_local_times_use_ha_timezone_when_program_timezone_differs():
    raw = time_source_program()
    raw["timezone"] = "UTC"
    raw["routines"][0]["steps"][0]["when"] = {
        "entity_range": {
            "entity_id": "calendar.work",
            "attribute": "start_time",
        }
    }
    context = PlanningContext(
        timezone="Europe/Stockholm",
        time_sources={
            "calendar.work": {
                "kind": "calendar",
                "start_time": "2026-10-06 08:00:00",
            }
        },
    )
    plan = generate_plan(validate_program(raw), date(2026, 10, 6), 1, context=context)
    assert plan.step_times["run"] == datetime(2026, 10, 6, 6, tzinfo=UTC)
