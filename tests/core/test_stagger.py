"""Uniform ticks, one permutation per transition, and canonical scheduling contracts."""

from datetime import UTC, date, datetime, timedelta

import pytest

from custom_components.occupied.custom_actions import parse_action_yaml
from custom_components.occupied.file_config import export_yaml, load_yaml
from custom_components.occupied.lighting import project_lighting
from custom_components.occupied.plan_codec import plan_from_data
from custom_components.occupied.planner import (
    generate_plan,
    occurrence_groups,
    preview_calendar_dates,
)
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import ProgramError, behavior_hash, validate_program

DAY = date(2026, 10, 14)
CONTEXT = PlanningContext("UTC")
TARGETS = ["light.a", "light.b", "light.c", "switch.d"]


def program(action=None, clock="18:00", **steps):
    return validate_program(
        {
            "schema_version": 1,
            "name": "Ticks",
            "steps": {
                "evening": {
                    "timing": {"absolute_time": {"start": clock}},
                    **(
                        action
                        or {"action": "turn_on", "entities": TARGETS, "stagger": {"enabled": True}}
                    ),
                },
                **steps,
            },
        }
    )


def plan(source, seed="ticks"):
    return generate_plan(source, DAY, seed, context=CONTEXT)


def test_one_target_per_even_tick_and_one_permutation():
    source = program()
    result = plan(source)
    start = result.step_times["evening"]
    assert [e.at - start for e in result.events] == [
        timedelta(seconds=i) for i in (30, 60, 90, 120)
    ]
    assert [e.tick for e in result.events] == [1, 2, 3, 4]
    assert {e.action.targets[0] for e in result.events} == set(TARGETS)
    assert all(len(e.action.targets) == 1 and e.tick_count == 4 for e in result.events)
    assert len(occurrence_groups(result)) == 4
    assert plan_from_data(result.to_dict()) == result
    assert plan(load_yaml(export_yaml(source))) == result
    assert plan(source) == result
    orders = {tuple(e.action.targets for e in plan(source, seed).events) for seed in range(10)}
    assert len(orders) > 1
    assert {tuple(e.at for e in plan(source, seed).events) for seed in range(10)} == {
        tuple(e.at for e in result.events)
    }


def test_single_entity_fires_at_period_end():
    result = plan(
        program(
            {
                "action": "turn_on",
                "entities": ["light.a"],
                "stagger": {"enabled": True, "period": "90s"},
            }
        )
    )
    assert result.events[0].at == result.step_times["evening"] + timedelta(seconds=90)


def test_disabled_custom_period_has_no_behavior_or_sampling_effect():
    plain = program({"action": "turn_on", "entities": TARGETS})
    disabled = program(
        {"action": "turn_on", "entities": TARGETS, "stagger": {"enabled": False, "period": "5m"}}
    )
    assert behavior_hash(plain) == behavior_hash(disabled)
    assert plan(plain).events == plan(disabled).events
    assert load_yaml(export_yaml(disabled)).steps["evening"].stagger.period == 300


def test_individual_data_and_custom_list_barrier_survive_shuffle():
    source = program(
        parse_action_yaml("""
- action: set_state
  stagger: {enabled: true, period: 20s}
  entities:
    light.a: {state: "on", brightness: 50, transition: 3}
    light.b: {state: "on", brightness: 200}
- action: scene.turn_on
  entities: [scene.evening]
""")
    )
    result = plan(source)
    assert [e.at - result.step_times["evening"] for e in result.events] == [
        timedelta(seconds=i) for i in (10, 20, 20)
    ]
    assert result.events[-1].action.action == "scene.turn_on"
    assert len(occurrence_groups(result)) == 2
    assert len(result.occurrences) == 1
    a = next(e for e in result.events if e.action.targets == ("light.a",))
    assert a.action.data == {"brightness": 50, "transition": 3}
    assert plan_from_data(result.to_dict()) == result
    before = project_lighting(source, result, a.at - timedelta(microseconds=1))
    assert "light.a" not in before
    assert project_lighting(source, result, a.at)["light.a"].brightness_pct == 50 * 100 / 255


def test_newer_off_intent_supersedes_pending_ticks():
    source = program(
        off={
            "timing": {"absolute_time": {"start": "18:00:45"}},
            "action": "turn_off",
            "entities": TARGETS,
        }
    )
    result = plan(source)
    ticks = [e for e in result.events if e.tick]
    assert [e.superseded for e in ticks] == [False, True, True, True]
    assert all(
        s.state == "off"
        for s in project_lighting(
            source, result, datetime(2026, 10, 14, 18, 3, tzinfo=UTC)
        ).values()
    )


def test_midnight_ticks_and_cross_date_supersession():
    source = program(
        clock="23:59",
        off={
            "timing": {"absolute_time": {"start": "00:00"}},
            "action": "turn_off",
            "entities": TARGETS,
        },
    )
    current, following = preview_calendar_dates(
        source, [DAY, DAY + timedelta(days=1)], "night", context=CONTEXT
    )
    ticks = [e for e in following.events if e.tick and e.id.startswith(str(DAY))]
    assert [e.tick for e in ticks] == [2, 3, 4]
    assert all(e.superseded for e in ticks)
    assert len([e for e in current.events if e.tick and e.id.startswith(str(DAY))]) == 1


@pytest.mark.parametrize(
    "stagger",
    [
        {"enabled": "true"},
        {"enabled": True, "period": 120},
        {"period": "0s"},
        {"period": "-1s"},
        {"period": "31m"},
        {"period": "0.5s"},
        {"period": None},
        {"period": "NaNs"},
        {"unknown": True},
    ],
)
def test_invalid_options_rejected(stagger):
    with pytest.raises(ProgramError):
        program({"action": "turn_on", "entities": TARGETS, "stagger": stagger})


@pytest.mark.parametrize(
    "action,entities",
    [
        ("scene.turn_on", ["scene.evening"]),
        ("cover.open_cover", ["cover.a"]),
        ("set_state", {"light.a": {"state": "on"}, "cover.a": {"state": "open"}}),
    ],
)
def test_ineligible_actions_have_stagger_issue(action, entities):
    with pytest.raises(ProgramError) as err:
        program({"action": action, "entities": entities, "stagger": {"enabled": True}})
    assert any(i.path[-1] == "stagger" for i in err.value.issues)


def test_wrapper_and_combined_period_limit():
    with pytest.raises(ProgramError):
        program(
            {"actions": [{"action": "turn_on", "entities": TARGETS}], "stagger": {"enabled": True}}
        )
    with pytest.raises(ProgramError):
        program(
            {
                "actions": [
                    {
                        "action": "turn_on",
                        "entities": TARGETS,
                        "stagger": {"enabled": True, "period": "20m"},
                    }
                ]
                * 2
            }
        )


def test_random_blocks_fit_before_end_and_inside_window():
    data = {
        "schema_version": 1,
        "name": "Random",
        "random": {
            "activity": {
                "start": {"absolute_time": {"start": "18:00"}},
                "end": {"absolute_time": {"start": "18:10"}},
                "count": 5,
                "min_duration": "3m",
                "max_duration": "4m",
                "on": {"action": "turn_on", "entities": TARGETS, "stagger": {"enabled": True}},
                "off": {
                    "action": "turn_on",
                    "entities": ["light.other"],
                    "stagger": {"enabled": True, "period": "1m"},
                },
            }
        },
    }
    result = plan(validate_program(data))
    assert result.feasible
    assert max(e.at for e in result.events) <= datetime(2026, 10, 14, 18, 10, tzinfo=UTC)
    for events in result.occurrences.values():
        assert all(e.at > e.authored_at for e in events)
    data["random"]["activity"]["min_duration"] = "2m"
    with pytest.raises(ProgramError, match="shorter than min_duration"):
        validate_program(data)


def test_following_direct_action_at_final_tick_keeps_authored_list_order():
    source = program(
        {
            "actions": [
                {"action": "turn_on", "entities": TARGETS, "stagger": {"enabled": True}},
                {"action": "turn_off", "entities": TARGETS},
            ]
        }
    )
    result = plan(source)
    assert not any(e.superseded for e in result.events)
    final = occurrence_groups(result)[-1]
    assert final[0].tick == 4
    assert all(e.action.action.endswith("turn_off") for e in final[1:])


def test_stagger_identifier_is_not_mistaken_for_action_options():
    disabled = {
        "timing": {"absolute_time": {"start": "19:00"}},
        "action": "turn_on",
        "entities": ["light.a"],
        "enabled": False,
    }
    first = program(stagger=disabled)
    second = program(stagger={**disabled, "entities": ["light.b"]})
    assert behavior_hash(first) != behavior_hash(second)


@pytest.mark.parametrize("action", ["turn_off", "light.turn_off", "switch.turn_off"])
def test_off_actions_have_the_same_uniform_ticks_and_shuffle(action):
    targets = ["switch.a", "switch.b"] if action.startswith("switch.") else ["light.a", "light.b"]
    source = program(
        {"action": action, "entities": targets, "stagger": {"enabled": True, "period": "90s"}}
    )
    result = plan(source)
    assert [e.at - result.step_times["evening"] for e in result.events] == [
        timedelta(seconds=45),
        timedelta(seconds=90),
    ]
    assert all(e.action.action.endswith("turn_off") for e in result.events)
    assert {e.action.targets[0] for e in result.events} == set(targets)
    assert plan_from_data(result.to_dict()) == result


def test_mixed_state_mapping_staggers_the_declared_states():
    source = program(
        {
            "action": "set_state",
            "stagger": {"enabled": True},
            "entities": {
                "light.a": {"state": "on", "brightness": 50},
                "light.b": {"state": "off", "transition": 3},
            },
        }
    )
    result = plan(source)
    b = next(e for e in result.events if e.action.targets == ("light.b",))
    assert b.action.action == "light.turn_off" and b.action.data == {"transition": 3}
    assert project_lighting(source, result, b.at)["light.b"].state == "off"


def test_newer_on_intent_supersedes_pending_off_ticks():
    source = program(
        {"action": "turn_off", "entities": TARGETS, "stagger": {"enabled": True}},
        on={
            "timing": {"absolute_time": {"start": "18:00:45"}},
            "action": "turn_on",
            "entities": TARGETS,
        },
    )
    ticks = [e for e in plan(source).events if e.tick]
    assert [e.superseded for e in ticks] == [False, True, True, True]
