"""Lux timing remains pending until an observed, stable threshold resolves it."""

from dataclasses import replace
from datetime import UTC, date, datetime, timedelta

import pytest

from custom_components.occupied.lux import Qualification, evaluate, lux_windows, sensor_lux
from custom_components.occupied.planner import generate_plan
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import ProgramError, program_data, validate_program

DAY = date(2026, 10, 30)
NOW = datetime(2026, 10, 30, 6, tzinfo=UTC)
CTX = PlanningContext("UTC", 59.3, 18.1)


def lux_program(**overrides):
    spec = {
        "entity_id": "sensor.outdoor",
        "above": 400,
        "for": "3m",
        "window": {
            "start": {"absolute_time": {"start": "06:00"}},
            "end": {"absolute_time": {"start": "09:00"}},
        },
    } | overrides
    return {
        "schema_version": 1,
        "name": "Lux",
        "steps": {
            "morning": {
                "timing": {"lux": spec},
                "action": "turn_off",
                "entities": ["light.window"],
            },
            "child": {
                "timing": {"relative_to": {"step": "morning", "start_offset": "10m"}},
                "action": "turn_on",
                "entities": ["switch.test"],
            },
        },
    }


def test_pending_and_actual_resolution_propagates_without_forecasting():
    program = validate_program(lux_program())
    pending = generate_plan(program, DAY, 1, context=CTX)
    assert not pending.events
    assert not pending.step_times
    assert pending.to_dict()["pending_occurrences"][0]["source_id"] == "morning"
    context = replace(CTX, lux_resolutions={str(DAY): {"morning": NOW.isoformat()}})
    actual = generate_plan(program, DAY, 1, context=context)
    assert actual.step_times == {"morning": NOW, "child": NOW + timedelta(minutes=10)}
    assert "for" in program_data(program)["steps"]["morning"]["timing"]["lux"]
    skipped = generate_plan(
        program, DAY, 1, context=replace(CTX, lux_resolutions={str(DAY): {"morning": None}})
    )
    assert not skipped.events and not skipped.pending_occurrences


@pytest.mark.parametrize(
    "overrides",
    [
        {"above": True},
        {"above": -1},
        {"above": float("nan")},
        {"above": float("inf")},
        {"below": 100},
        {"for": "61m"},
        {"delay": {"min": "2m", "max": "1m"}},
        {"entity_id": "light.outdoor"},
    ],
)
def test_invalid_lux(overrides):
    with pytest.raises(ProgramError):
        validate_program(lux_program(**overrides))


def test_qualification_resets_through_noise_and_missing_readings():
    spec = validate_program(lux_program(delay={"min": "1m"})).steps["morning"].timing.lux
    state = Qualification()
    assert evaluate(spec, state, NOW, NOW + timedelta(hours=3), 500, 60) is None
    assert (
        evaluate(spec, state, NOW + timedelta(minutes=2), NOW + timedelta(hours=3), 400, 60) is None
    )
    assert state.since is None
    evaluate(spec, state, NOW + timedelta(minutes=3), NOW + timedelta(hours=3), 500, 60)
    assert (
        evaluate(spec, state, NOW + timedelta(minutes=6), NOW + timedelta(hours=3), 500, 60) is None
    )
    assert (
        evaluate(spec, state, NOW + timedelta(minutes=7), NOW + timedelta(hours=3), 500, 60)
        == "lux"
    )
    evaluate(spec, state, NOW + timedelta(minutes=8), NOW + timedelta(hours=3), None, 60)
    assert state.since is None


def test_deadline_wins_and_skip_is_explicit():
    spec = validate_program(lux_program()).steps["morning"].timing.lux
    assert evaluate(spec, Qualification(), NOW, NOW, 500, 0) == "fallback"
    assert (
        evaluate(spec.model_copy(update={"fallback": "skip"}), Qualification(), NOW, NOW, None, 0)
        == "skipped"
    )


def test_overnight_window_requires_explicit_day_and_is_bounded():
    raw = lux_program()
    window = raw["steps"]["morning"]["timing"]["lux"]["window"]
    window["start"]["absolute_time"]["start"] = "22:00"
    window["end"]["absolute_time"]["start"] = "02:00"
    window["end_day_offset"] = 1
    program = validate_program(raw)
    start, end = lux_windows(program, DAY, CTX)["morning"]
    assert end - start == timedelta(hours=4)


@pytest.mark.parametrize("value", ["unknown", "unavailable", "NaN", "inf", "-1", "broken"])
def test_invalid_sensor_is_never_zero(value):
    assert sensor_lux(value, {"device_class": "illuminance", "unit_of_measurement": "lx"}) is None


def test_sensor_metadata_is_required():
    assert sensor_lux("100", {}) is None
    assert sensor_lux("100", {"device_class": "illuminance", "unit_of_measurement": "lx"}) == 100


def test_negative_dynamic_dependencies_and_caps_are_rejected():
    raw = lux_program()
    raw["steps"]["child"]["timing"]["relative_to"]["start_offset"] = "-1m"
    with pytest.raises(ProgramError, match="nonnegative"):
        validate_program(raw)
    raw["steps"]["child"]["timing"]["relative_to"]["start_offset"] = "0s"
    raw["steps"]["child"]["timing"]["latest_at"] = {"absolute_time": {"start": "10:00"}}
    with pytest.raises(ProgramError, match="timing caps"):
        validate_program(raw)


def test_invalid_window_and_polar_sun_are_explicit():
    raw = lux_program()
    raw["steps"]["morning"]["timing"]["lux"]["window"]["end"] = {
        "absolute_time": {"start": "05:00"}
    }
    assert not generate_plan(validate_program(raw), DAY, 1, context=CTX).feasible
    raw["steps"]["morning"]["timing"]["lux"]["window"] = {
        "start": {"relative_to": {"sun": "sunrise"}},
        "end": {"relative_to": {"sun": "sunset"}},
    }
    result = generate_plan(
        validate_program(raw), date(2026, 12, 21), 1, context=replace(CTX, latitude=89)
    )
    assert not result.events and not result.pending_occurrences
    assert any(issue.code == "sun_unavailable" for issue in result.issues)


def test_preview_and_codec_preserve_pending_overnight_windows():
    from custom_components.occupied.plan_codec import plan_from_data
    from custom_components.occupied.planner import preview_calendar_dates

    raw = lux_program()
    spec = raw["steps"]["morning"]["timing"]["lux"]
    spec["window"] = {
        "start": {"absolute_time": {"start": "22:00"}},
        "end": {"absolute_time": {"start": "02:00"}},
        "end_day_offset": 1,
    }
    program = validate_program(raw)
    plan = generate_plan(program, DAY, 1, context=CTX)
    assert plan_from_data(plan.to_dict()).to_dict() == plan.to_dict()
    preview = preview_calendar_dates(program, [DAY], 1, context=CTX)[0]
    assert len([item for item in preview.pending_occurrences if "entity_id" in item]) == 2


def test_spring_and_autumn_windows_use_elapsed_utc_time():
    raw = lux_program()
    raw["steps"]["morning"]["timing"]["lux"]["window"] = {
        "start": {"absolute_time": {"start": "01:00"}},
        "end": {"absolute_time": {"start": "04:00"}},
    }
    program = validate_program(raw)
    context = replace(CTX, timezone="Europe/Stockholm")
    for day, hours in [(date(2026, 3, 29), 2), (date(2026, 10, 25), 4)]:
        start, end = lux_windows(program, day, context)["morning"]
        assert end - start == timedelta(hours=hours)
