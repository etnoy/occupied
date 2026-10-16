"""Source-date caps and strict gates across schema, planning and persistence."""

from copy import deepcopy
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest
from astral import Observer
from astral.sun import sunrise, sunset

from custom_components.occupied.file_config import export_yaml, load_yaml, read_program
from custom_components.occupied.lighting import project_lighting
from custom_components.occupied.models import Program
from custom_components.occupied.planner import (
    generate_plan,
    preview_calendar_dates,
    resolve_actions,
)
from custom_components.occupied.runtime_planning import runtime_dates
from custom_components.occupied.storage import plan_from_data
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import (
    ProgramError,
    behavior_hash,
    program_data,
    validate_program,
)

DAY = date(2026, 10, 13)
CTX = PlanningContext("UTC", 59.3, 18.1)


def program(timing):
    return {
        "schema_version": 1,
        "name": "Limits",
        "steps": {
            "parent": {
                "timing": timing,
                "action": "turn_on",
                "entities": ["light.a"],
            },
            "child": {
                "timing": {"relative_to": {"step": "parent", "start_offset": "10m"}},
                "action": "turn_off",
                "entities": ["light.a"],
            },
        },
    }


def plan(raw, day=DAY, context=CTX, seed=1):
    return generate_plan(validate_program(raw), day, seed, context=context)


@pytest.mark.parametrize(
    "hour,minute,expected", [(16, 0, "14:30"), (21, 0, "18:00"), (19, 30, "18:00")]
)
def test_sunset_cap_samples_one_occurrence(monkeypatch, hour, minute, expected):
    monkeypatch.setattr(
        "custom_components.occupied.time_utils.sunset",
        lambda *a, **k: datetime(2026, 10, 13, hour, minute, tzinfo=UTC),
    )
    raw = program(
        {
            "relative_to": {"sun": "sunset", "start_offset": "-90m"},
            "latest_at": {"absolute_time": {"start": "18:00"}},
        }
    )
    result = plan(raw)
    expected_at = datetime.fromisoformat(f"{DAY}T{expected}+00:00")
    assert result.step_times["parent"] == expected_at
    assert result.step_times["child"] == expected_at + timedelta(minutes=10)
    assert len([e for e in result.events if e.source_id == "parent"]) == 1
    if hour == 21:
        issue = next(i for i in result.issues if i.code == "latest_at_applied")
        assert issue.path == ("steps", "parent", "timing", "latest_at")
        assert issue.details["adjusted"] == expected_at.isoformat()
    assert plan_from_data(result.to_dict()).to_dict() == result.to_dict()


@pytest.mark.parametrize("hour,minute,occurs", [(6, 0, True), (3, 30, False), (4, 0, False)])
def test_morning_gate_is_strict_and_suppresses_all_actions(monkeypatch, hour, minute, occurs):
    monkeypatch.setattr(
        "custom_components.occupied.time_utils.sunrise",
        lambda *a, **k: datetime(2026, 10, 13, hour, minute, tzinfo=UTC),
    )
    raw = program(
        {
            "absolute_time": {"start": "05:30"},
            "only_before": {"relative_to": {"sun": "sunrise", "start_offset": "90m"}},
        }
    )
    raw["steps"]["parent"].pop("action")
    raw["steps"]["parent"].pop("entities")
    raw["steps"]["parent"]["actions"] = [
        {"action": "turn_on", "entities": ["light.a", "switch.a"], "stagger": {"enabled": True}},
        {"action": "script.turn_on", "entities": ["script.a"]},
    ]
    result = plan(raw)
    assert result.feasible
    assert bool(result.events) == occurs
    assert ("parent" in result.step_times) == occurs
    if not occurs:
        assert not result.step_times
        issue = next(i for i in result.issues if i.code == "only_before_skipped")
        assert issue.path == ("steps", "parent", "timing", "only_before")
        assert issue.details["candidate"] == f"{DAY}T05:30:00+00:00"
        assert any(i.code == "anchor_skipped" for i in result.issues)
        assert not project_lighting(validate_program(raw), result, result.end)
    assert plan_from_data(result.to_dict()).to_dict() == result.to_dict()


def test_cap_precedes_gate_and_does_not_resample():
    timing = {"absolute_time": {"start": "17:00", "end": "20:00"}}
    original = program(deepcopy(timing))
    timing.update(
        latest_at={"absolute_time": {"start": "18:00"}},
        only_before={"absolute_time": {"start": "18:01"}},
    )
    limited = program(timing)
    for seed in range(30):
        candidate = plan(original, seed=seed).step_times["parent"]
        result = plan(limited, seed=seed)
        assert result.step_times["parent"] == min(candidate, datetime(2026, 10, 13, 18, tzinfo=UTC))
    timing["only_before"]["absolute_time"]["start"] = "18:00"
    for seed in range(30):
        candidate = plan(original, seed=seed).step_times["parent"]
        result = plan(limited, seed=seed)
        assert bool(result.events) == (candidate.hour < 18)


@pytest.mark.parametrize("modifier", ["latest_at", "only_before"])
@pytest.mark.parametrize(
    "boundary",
    [
        None,
        {},
        {"absolute_time": None},
        {"relative_to": None},
        {"absolute_time": {"start": "18:00", "end": "18:00"}},
        {"absolute_time": {"start": "25:00"}},
        {"absolute_time": {"start": 1800}},
        {"relative_to": {"sun": "sunrise", "end_offset": "0s"}},
        {"relative_to": {"sun": "sunrise", "start_offset": None}},
        {"relative_to": {"sun": "sunrise", "start_offset": "168h1s"}},
        {"relative_to": {"sun": "moonrise"}},
        {"relative_to": {"step": "parent"}},
        {"relative_to": {"entity": "sensor.alarm"}},
        {"relative_to": {"random": "window"}},
        {"duration": {"min": "1h"}},
        {"absolute_time": {"start": "18:00"}, "only_before": {"absolute_time": {"start": "19:00"}}},
        {"absolute_time": {"start": "18:00"}, "relative_to": {"sun": "sunrise"}},
        {"absolute_time": {"start": "18:00"}, "unknown": True},
    ],
)
def test_invalid_boundaries_rejected(modifier, boundary):
    raw = program({"absolute_time": {"start": "05:30"}, modifier: boundary})
    with pytest.raises(ProgramError):
        validate_program(raw)


def test_schema_limits_modifiers_to_steps_and_fixed_boundary_shapes():
    definitions = Program.model_json_schema()["$defs"]
    assert definitions["Step"]["properties"]["timing"] == {"$ref": "#/$defs/StepTiming"}
    for edge in ("start", "end"):
        assert definitions["RandomEvent"]["properties"][edge] == {"$ref": "#/$defs/Timing"}
    assert definitions["Timing"]["additionalProperties"] is False
    assert "latest_at" not in definitions["Timing"]["properties"]
    assert set(definitions["BoundaryClock"]["properties"]) == {"start"}
    assert set(definitions["BoundarySolar"]["properties"]) == {"sun", "start_offset"}
    for name in ("TimingBoundary", "BoundaryClock", "BoundarySolar"):
        assert definitions[name]["additionalProperties"] is False
    for key in ("latest_at", "only_before"):
        assert definitions["StepTiming"]["properties"][key]["not"] == {"type": "null"}


@pytest.mark.parametrize("edge", ["start", "end"])
@pytest.mark.parametrize("modifier", ["latest_at", "only_before"])
def test_random_windows_reject_modifiers(edge, modifier):
    raw = program({"absolute_time": {"start": "18:00"}})
    raw["random"] = {
        "window": {
            "start": {"absolute_time": {"start": "18:00"}},
            "end": {"absolute_time": {"start": "20:00"}},
            "on": {"action": "turn_on", "entities": ["light.b"]},
            "off": {"action": "turn_off", "entities": ["light.b"]},
        }
    }
    raw["random"]["window"][edge][modifier] = {"absolute_time": {"start": "19:00"}}
    with pytest.raises(ProgramError) as raised:
        validate_program(raw)
    assert raised.value.issues[0].path == ("random", "window", edge, modifier)


def test_export_normalizes_boundaries_and_hashes_behavior_only():
    raw = program(
        {
            "absolute_time": {"start": "18:30"},
            "latest_at": {"absolute_time": {"start": "18:00:00"}},
            "only_before": {"relative_to": {"sun": "sunset", "start_offset": "0s"}},
        }
    )
    original = validate_program(raw)
    exported = export_yaml(original)
    assert "18:00:00" not in exported
    assert (
        "start_offset"
        not in program_data(original)["steps"]["parent"]["timing"]["only_before"]["relative_to"]
    )
    assert load_yaml(exported) == original
    assert export_yaml(load_yaml(exported)) == exported
    raw["steps"]["parent"]["name"] = "New title"
    assert behavior_hash(validate_program(raw)) == behavior_hash(original)
    raw["steps"]["parent"]["timing"]["latest_at"]["absolute_time"]["start"] = "17:00"
    assert behavior_hash(validate_program(raw)) != behavior_hash(original)


@pytest.mark.parametrize(
    "timing",
    [
        {"relative_to": {"sun": "sunset"}, "latest_at": {"absolute_time": {"start": "18:00"}}},
        {"absolute_time": {"start": "05:30"}, "only_before": {"relative_to": {"sun": "sunrise"}}},
        {"absolute_time": {"start": "18:00"}, "latest_at": {"relative_to": {"sun": "sunset"}}},
    ],
)
def test_unavailable_sun_is_no_fallback_and_no_intent(timing):
    result = plan(program(timing), date(2026, 6, 20), PlanningContext("Europe/Oslo", 78.2, 15.6))
    assert result.feasible and not result.events and not result.step_times
    assert any(i.code == "sun_unavailable" for i in result.issues)


@pytest.mark.parametrize(
    "day,expected",
    [
        (date(2026, 3, 29), "2026-03-29T01:00:00+00:00"),
        (date(2026, 10, 25), "2026-10-25T00:30:00+00:00"),
    ],
)
def test_clock_caps_preserve_dst_rules_without_rollover(day, expected):
    result = plan(
        program(
            {
                "absolute_time": {"start": "18:00"},
                "latest_at": {"absolute_time": {"start": "02:30"}},
            }
        ),
        day,
        PlanningContext("Europe/Stockholm"),
    )
    assert result.step_times["parent"].isoformat() == expected


@pytest.mark.parametrize(
    "day", [date(2026, 1, 15), date(2026, 6, 15), date(2026, 3, 29), date(2026, 10, 25)]
)
def test_actual_seasonal_solar_rules(day):
    context = PlanningContext("Europe/Stockholm", 59.3, 18.1)
    zone = ZoneInfo(context.timezone)
    observer = Observer(59.3, 18.1)

    def clock(hour, minute=0):
        return (
            datetime.combine(day, datetime.min.time(), zone)
            .replace(hour=hour, minute=minute)
            .astimezone(UTC)
        )

    bedroom = plan(
        program(
            {
                "relative_to": {"sun": "sunset", "start_offset": "-90m"},
                "latest_at": {"absolute_time": {"start": "18:00"}},
            }
        ),
        day,
        context,
    )
    assert bedroom.step_times["parent"] == min(
        sunset(observer, day, tzinfo=zone).astimezone(UTC) - timedelta(minutes=90), clock(18)
    )
    morning = plan(
        program(
            {
                "absolute_time": {"start": "05:30"},
                "only_before": {"relative_to": {"sun": "sunrise", "start_offset": "90m"}},
            }
        ),
        day,
        context,
    )
    assert bool(morning.events) == (
        clock(5, 30) < sunrise(observer, day, tzinfo=zone).astimezone(UTC) + timedelta(minutes=90)
    )


def test_signed_cap_horizon_and_calendar_slices_keep_source_weekday(monkeypatch):
    def solar(*args, **kwargs):
        return datetime.combine(kwargs["date"], datetime.min.time(), UTC) + timedelta(hours=1)

    monkeypatch.setattr("custom_components.occupied.time_utils.sunrise", solar)
    raw = program(
        {
            "absolute_time": {"start": "18:00"},
            "latest_at": {"relative_to": {"sun": "sunrise", "start_offset": "-26h"}},
        }
    )
    for step in raw["steps"].values():
        step["days"] = ["tue"]
    p = validate_program(raw)
    result = plan(raw)
    assert result.step_times["parent"] == datetime(2026, 10, 11, 23, tzinfo=UTC)
    assert DAY in runtime_dates(p, date(2026, 10, 11))
    before, actual, after = preview_calendar_dates(
        p, [date(2026, 10, 10), date(2026, 10, 11), date(2026, 10, 12)], 1, context=CTX
    )
    assert not before.events and not after.events
    assert {e.id.split(":")[0] for e in actual.events} == {DAY.isoformat()}
    assert {e.source_id for e in actual.events} == {"parent", "child"}
    assert any(i.code == "latest_at_applied" for i in actual.issues)


def test_existing_hash_and_seeded_schedule_are_unchanged():
    p = read_program(Path(__file__).parents[1] / "examples/house.yaml")
    assert behavior_hash(p) == "077401cc3d95cdd5c16bb9ea9b16b267f7d30d3e64c99e4918faceb8df4d45e4"
    result = generate_plan(
        p, DAY, "solar-regression", context=PlanningContext("Europe/Stockholm", 59.3, 18.1)
    )
    assert {k: v.isoformat() for k, v in result.step_times.items()} == {
        "bedtime": "2026-10-13T20:59:23.837406+00:00",
        "sunrise_blinds": "2026-10-13T05:26:52.295668+00:00",
        "wake_up": "2026-10-13T05:07:34.063070+00:00",
        "breakfast": "2026-10-13T05:08:43.157503+00:00",
        "breakfast_scene": "2026-10-13T05:08:43.157503+00:00",
    }


def test_lighting_example_preserves_exact_scene_targets_and_brightness():
    p = read_program(Path(__file__).parents[1] / "examples/solar-limits.yaml")
    bedroom = resolve_actions(p.steps["sunset_bedroom_lights"])
    assert {a.targets[0] for a in bedroom} == {
        "switch.bedroom_lamp",
        "switch.basement_lamp",
        "switch.guest_room_lamp",
        "switch.bedroom_window",
        "switch.basement_window",
        "switch.guest_room_window",
        "switch.study_window",
    }
    assert len(bedroom) == 7 and all(a.action == "switch.turn_on" for a in bedroom)
    morning = resolve_actions(p.steps["early_morning_lights"])
    assert {a.targets[0]: a.data for a in morning} == {
        "switch.living_room_window_1": {},
        "switch.living_room_window_2": {},
        "switch.living_room_window_3": {},
        "switch.living_room_window_4": {},
        "switch.kitchen_window_1": {},
        "switch.kitchen_window_2": {},
        "switch.basement_string_lights": {},
        "switch.desk_lamp": {},
        "switch.display_cabinet": {},
        "light.living_room": {"brightness": 255},
        "light.kitchen": {"brightness": 255},
        "switch.living_room_lamp": {},
        "switch.porch_steps": {},
        "switch.decorative_lamp": {},
    }
    assert len(morning) == 14
    assert all(a.action.endswith(".turn_on") for a in morning)
