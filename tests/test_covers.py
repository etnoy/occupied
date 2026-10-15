"""Cover previews are authored targets; activation never replays movement."""

from datetime import UTC, date, datetime

import pytest

from custom_components.occupied.covers import CoverPosition, cover_target, project_covers
from custom_components.occupied.planner import ResolvedAction, generate_plan
from custom_components.occupied.preview import preview_draft
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import ProgramError, validate_program


def cover(action, data=None):
    return ResolvedAction(action, ("cover.blind",), data or {})


def test_targets_keep_independent_axes_and_forget_stopped_positions():
    target = cover_target(cover("cover.set_cover_position", {"position": 60}))
    assert target == CoverPosition(position=60)
    target = cover_target(cover("cover.set_cover_tilt_position", {"tilt_position": 25}), target)
    assert target == CoverPosition(position=60, tilt_position=25)
    target = cover_target(cover("cover.stop_cover"), target)
    assert target == CoverPosition(tilt_position=25)
    assert cover_target(cover("cover.stop_cover_tilt"), target) == CoverPosition()
    assert cover_target(cover("cover.open_cover"), target) == CoverPosition(100, 25)
    assert cover_target(cover("cover.close_cover_tilt"), target) == CoverPosition(tilt_position=0)
    assert cover_target(cover("cover.open_cover_tilt"), target) == CoverPosition(tilt_position=100)
    assert cover_target(cover("cover.close_cover"), target) == CoverPosition(0, 25)


@pytest.mark.parametrize(
    "action,data",
    [
        ("cover.toggle", {}),
        ("script.turn_on", {}),
        ("cover.set_cover_position", {}),
        ("cover.set_cover_position", {"position": True}),
        ("cover.set_cover_position", {"position": "60"}),
        ("cover.set_cover_position", {"position": 60.5}),
        ("cover.set_cover_position", {"position": 101}),
        ("cover.set_cover_position", {"position": 60, "vendor": "slow"}),
    ],
)
def test_opaque_or_invalid_payloads_do_not_invent_positions(action, data):
    assert cover_target(cover(action, data), CoverPosition(100, 25)) == CoverPosition()


@pytest.fixture
def cover_program():
    return validate_program(
        {
            "schema_version": 1,
            "name": "Blinds",
            "steps": {
                "position": {
                    "timing": {"absolute_time": {"start": "08:00"}},
                    "action": "cover.set_cover_position",
                    "entities": ["cover.blind"],
                    "data": {"position": 60},
                },
                "tilt": {
                    "timing": {"absolute_time": {"start": "09:00"}},
                    "action": "cover.set_cover_tilt_position",
                    "entities": ["cover.blind"],
                    "data": {"tilt_position": 25},
                },
                "stop": {
                    "timing": {"absolute_time": {"start": "10:00"}},
                    "action": "cover.stop_cover",
                    "entities": ["cover.blind"],
                },
                "opaque": {
                    "timing": {"absolute_time": {"start": "11:00"}},
                    "action": "script.turn_on",
                    "entities": ["cover.blind"],
                },
            },
        }
    )


def test_projection_and_preview_api_track_targets_without_light_handover(cover_program):
    context = PlanningContext("UTC")
    plan = generate_plan(cover_program, date(2026, 10, 13), 0, context=context)

    def at(hour):
        return datetime(2026, 10, 13, hour, tzinfo=UTC)

    assert project_covers(cover_program, plan, at(7)) == {}
    assert project_covers(cover_program, plan, at(8)) == {"cover.blind": CoverPosition(60)}
    assert project_covers(cover_program, plan, at(9)) == {"cover.blind": CoverPosition(60, 25)}
    assert project_covers(cover_program, plan, at(10)) == {
        "cover.blind": CoverPosition(tilt_position=25)
    }
    assert project_covers(cover_program, plan, at(11)) == {}
    assert project_covers(cover_program, plan, at(9), yielded={"cover.blind"}) == {}
    result = preview_draft(cover_program, date(2026, 10, 13), 1, 0, context, at(9))
    assert result["covers"] == {"cover.blind": {"position": 60, "tilt_position": 25}}
    assert result["lighting"] == {} and result["handover"]["targets"] == {}
    with pytest.raises(ProgramError, match="timezone-aware"):
        project_covers(cover_program, plan, at(9).replace(tzinfo=None))
    with pytest.raises(ProgramError, match="covering"):
        project_covers(cover_program, plan, datetime(2026, 10, 14, 9, tzinfo=UTC))


def test_random_cover_start_and_end_project_through_native_services():
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Random blinds",
            "random": {
                "blinds": {
                    "start": {"absolute_time": {"start": "08:00"}},
                    "end": {"absolute_time": {"start": "09:00"}},
                    "count": 1,
                    "on": {"action": "cover.open_cover", "entities": ["cover.blind"]},
                    "off": {"action": "cover.close_cover", "entities": ["cover.blind"]},
                },
            },
        }
    )
    plan = generate_plan(program, date(2026, 10, 13), 0, context=PlanningContext("UTC"))
    start, end = plan.events
    assert not start.action.replay_safe and not end.action.replay_safe
    assert project_covers(program, plan, start.at) == {"cover.blind": CoverPosition(100)}
    assert project_covers(program, plan, end.at) == {"cover.blind": CoverPosition(0)}


@pytest.mark.parametrize(
    "service,expected",
    [
        ("open_cover", "open_cover"),
        ("close_cover", "close_cover"),
        ("open_cover_tilt", "open_cover_tilt"),
        ("close_cover_tilt", "close_cover_tilt"),
    ],
)
def test_startup_enforcement_uses_native_endpoint_commands(service, expected):
    from custom_components.occupied.reconciliation import expected_actions

    program = validate_program(
        {
            "schema_version": 1,
            "name": "Endpoints",
            "steps": {
                "target": {
                    "timing": {"absolute_time": {"start": "08:00"}},
                    "action": f"cover.{service}",
                    "entities": ["cover.blind"],
                }
            },
        }
    )
    plan = generate_plan(program, date(2026, 10, 13), 0, context=PlanningContext("UTC"))
    calls = expected_actions(program, plan, datetime(2026, 10, 13, 9, tzinfo=UTC))["cover.blind"]
    assert [(call.action, call.data) for call in calls] == [(f"cover.{expected}", {})]
