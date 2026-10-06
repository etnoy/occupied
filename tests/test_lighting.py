"""Declarative projection: leases, routine/safety priority, and handover endpoints."""

from dataclasses import replace
from datetime import UTC, date, datetime, timedelta

import pytest

from custom_components.occupied.lighting import LightState, preview_handover, project_lighting
from custom_components.occupied.planner import PlanEvent, ResolvedAction, generate_plan
from custom_components.occupied.validation import ProgramError, validate_program


def event(minute, kind, service, *, lease=None, data=None, priority=20):
    at = datetime(2026, 10, 6, 8, tzinfo=UTC) + timedelta(minutes=minute)
    action = ResolvedAction(f"light.{service}", ("light.a",), data or {}, ("light.a",), True)
    return PlanEvent(
        f"{kind}:{minute}:{lease}", at, "proof", kind, action, priority=priority, lease_id=lease
    )


def scenario(program_dict, events):
    program = validate_program(program_dict)
    plan = generate_plan(program, date(2026, 10, 6), 0)
    return program, replace(plan, events=tuple(sorted(events, key=lambda item: item.order_key)))


def test_overlapping_window_end_releases_only_its_own_lease(program_dict):
    program, plan = scenario(
        program_dict,
        [
            event(0, "window_start", "turn_on", lease="first", priority=10),
            event(10, "window_start", "turn_on", lease="second", priority=10),
            event(20, "window_end", "turn_off", lease="first", priority=10),
            event(30, "window_end", "turn_off", lease="second", priority=10),
        ],
    )
    during = project_lighting(program, plan, datetime(2026, 10, 6, 8, 25, tzinfo=UTC))
    assert during["light.a"] == LightState("on", 70)
    assert during["light.b"] == LightState("off", 0)
    after = project_lighting(program, plan, datetime(2026, 10, 6, 8, 30, tzinfo=UTC))
    assert after["light.a"].state == "off"


def test_routine_off_suppresses_random_until_explicit_on(program_dict):
    program, plan = scenario(
        program_dict,
        [
            event(0, "step", "turn_off"),
            event(10, "window_start", "turn_on", lease="random", priority=10),
            event(20, "step", "turn_on", data={"brightness_pct": 40}),
            event(30, "window_end", "turn_off", lease="random", priority=10),
        ],
    )
    assert (
        project_lighting(program, plan, datetime(2026, 10, 6, 8, 15, tzinfo=UTC))["light.a"].state
        == "off"
    )
    assert project_lighting(program, plan, datetime(2026, 10, 6, 8, 35, tzinfo=UTC))[
        "light.a"
    ] == LightState("on", 40)


def test_safety_off_has_day_priority_and_yielded_targets_are_excluded(program_dict):
    program, plan = scenario(
        program_dict,
        [
            event(0, "step", "turn_off", priority=30),
            event(10, "step", "turn_on", data={"brightness_pct": 100}),
            event(20, "window_start", "turn_on", lease="random", priority=10),
        ],
    )
    at = datetime(2026, 10, 6, 8, 30, tzinfo=UTC)
    assert project_lighting(program, plan, at)["light.a"].state == "off"
    assert set(project_lighting(program, plan, at, yielded=frozenset({"light.a"}))) == {"light.b"}


def test_baseline_on_is_not_claimed_for_random_off_cleanup(program_dict):
    program_dict["lighting"]["baseline"][0].update({"state": "on", "brightness_pct": 80})
    program, plan = scenario(
        program_dict,
        [
            event(0, "window_start", "turn_on", lease="random", priority=10),
            event(10, "window_end", "turn_off", lease="random", priority=10),
        ],
    )
    assert project_lighting(program, plan, datetime(2026, 10, 6, 8, 20, tzinfo=UTC))[
        "light.a"
    ] == LightState("on", 80)


def test_brightness_and_color_preserve_known_on_level_and_replace_color_mode(program_dict):
    program, plan = scenario(
        program_dict,
        [
            event(0, "step", "turn_on", data={"brightness_pct": 35, "color_temp_kelvin": 2700}),
            event(10, "step", "turn_on"),
            event(20, "step", "turn_on", data={"rgb_color": [10, 20, 30]}),
        ],
    )
    state = project_lighting(program, plan, datetime(2026, 10, 6, 8, 15, tzinfo=UTC))["light.a"]
    assert state.brightness_pct == 35
    assert state.color_temp_kelvin == 2700
    state = project_lighting(program, plan, datetime(2026, 10, 6, 8, 25, tzinfo=UTC))["light.a"]
    assert state.rgb_color == (10, 20, 30)
    assert state.color_temp_kelvin is None
    assert state.brightness_pct == 35


def test_undefined_baseline_and_opaque_scripts_are_left_out_of_projection(program_dict):
    program_dict["lighting"]["baseline"] = [{"targets": {"entities": ["light.a"]}, "state": "off"}]
    program, plan = scenario(program_dict, [])
    at = datetime(2026, 10, 6, 8, tzinfo=UTC)
    opaque = PlanEvent(
        "opaque",
        at,
        "scene",
        "step",
        ResolvedAction("scene.turn_on", ("scene.evening",), {}, ("light.a",)),
    )
    plan = replace(plan, events=(opaque,))
    assert project_lighting(program, plan, at) == {"light.a": LightState("off", 0)}
    assert any(issue.code == "undefined_baseline" for issue in plan.issues)


def test_handover_projects_completion_rather_than_current_or_next_event(program_dict):
    program, plan = scenario(
        program_dict,
        [
            event(5, "step", "turn_on", data={"brightness_pct": 45}),
            event(8, "step", "turn_off"),
            event(9, "step", "turn_on", data={"brightness_pct": 25}),
        ],
    )
    start = datetime(2026, 10, 6, 8, tzinfo=UTC)
    result = preview_handover(program, plan, start, observed={"light.a": LightState("on", 90)})
    assert result["targets"]["light.a"]["target"] == {"state": "on", "brightness_pct": 25}
    assert result["targets"]["light.a"]["observed"]["brightness_pct"] == 90
    assert result["targets"]["light.a"]["deadline"] == "2026-10-06T08:10:00+00:00"


def test_group_overrides_project_each_completion_and_shared_groups_take_longest(program_dict):
    program_dict["groups"][0]["handover"] = {"duration": "5m"}
    program_dict["groups"].append(
        {"id": "shared", "name": "Shared", "entities": ["light.a"], "handover": {"duration": "15m"}}
    )
    program_dict["lighting"]["managed_targets"]["groups"].append("shared")
    program, plan = scenario(
        program_dict, [event(8, "step", "turn_on", data={"brightness_pct": 30})]
    )
    result = preview_handover(program, plan, datetime(2026, 10, 6, 8, tzinfo=UTC))
    assert result["targets"]["light.a"]["duration_seconds"] == 900
    assert result["targets"]["light.a"]["target"]["state"] == "on"
    assert result["targets"]["light.b"]["duration_seconds"] == 300
    assert result["targets"]["light.b"]["target"]["state"] == "off"


def test_handover_beyond_current_plan_reports_next_day_requirement(program_dict):
    program, plan = scenario(program_dict, [])
    result = preview_handover(program, plan, plan.end - timedelta(minutes=5))
    assert not result["targets"]
    assert result["issues"][0]["code"] == "next_day_plan_required"
    with pytest.raises(ProgramError):
        project_lighting(program, plan, datetime(2026, 10, 6, 8))
