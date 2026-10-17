"""Scene-style state resolution, strict block parsing, and complete-model retention."""

from datetime import UTC, date, datetime

import pytest

from custom_components.occupied.custom_actions import parse_action_yaml
from custom_components.occupied.file_config import export_yaml, load_yaml
from custom_components.occupied.lighting import project_lighting
from custom_components.occupied.models import controlled_entities, projectable_lights
from custom_components.occupied.plan_codec import plan_from_data
from custom_components.occupied.planner import generate_plan, resolve_actions
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import (
    ProgramError,
    behavior_hash,
    program_data,
    program_revision,
    validate_program,
)

BLOCK = """
- action: set_state
  entities:
    light.sofa:
      state: "on"
      brightness: 20
      rgb_color: [255, 80, 0]
      transition: 3
    switch.window:
      state: "off"
    cover.blind:
      position: 40
- action: scene.turn_on
  entities: [scene.evening]
"""


def custom_program(block=BLOCK):
    return validate_program(
        {
            "schema_version": 1,
            "name": "Custom",
            "steps": {
                "sunset": {
                    "timing": {"absolute_time": {"start": "18:00", "end": "18:30"}},
                    **parse_action_yaml(block),
                }
            },
        }
    )


def test_custom_resolution_projection_storage_and_roundtrip():
    program = custom_program()
    actions = resolve_actions(program.steps["sunset"])
    assert [a.action for a in actions] == [
        "cover.set_cover_position",
        "light.turn_on",
        "switch.turn_off",
        "scene.turn_on",
    ]
    assert actions[1].data == {"brightness": 20, "rgb_color": [255, 80, 0], "transition": 3}
    assert controlled_entities(program) == {
        "cover.blind",
        "light.sofa",
        "switch.window",
        "scene.evening",
    }
    assert projectable_lights(program) == {"light.sofa"}
    plan = generate_plan(program, date(2026, 10, 14), "stable", context=PlanningContext("UTC"))
    assert len({e.at for e in plan.events}) == 1
    assert len({e.group_id for e in plan.events}) == 1
    assert all(e.custom for e in plan.events)
    assert plan_from_data(plan.to_dict()) == plan
    intent = project_lighting(program, plan, datetime(2026, 10, 14, 19, tzinfo=UTC))["light.sofa"]
    assert intent.brightness_pct == 20 * 100 / 255
    text = export_yaml(program)
    assert program_data(load_yaml(text)) == program_data(program)
    assert "actions:" in text and "brightness_pct:" not in text
    renamed = program_data(program)
    renamed["steps"]["sunset"]["name"] = "New title"
    assert behavior_hash(validate_program(renamed)) == behavior_hash(program)


@pytest.mark.parametrize(
    "settings",
    [
        "state: on",
        'state: "maybe"',
        'state: "on"\nbrightness_pct: 30',
        'state: "on"\nbrightness: 0',
        'state: "on"\nbrightness: 256',
        'state: "on"\nbrightness: 1.5',
        'state: "off"\nbrightness: 20',
        'state: "on"\nrgb_color: [255, 0, 1.5]',
        'state: "on"\nrgb_color: [255, 0, 0]\nhs_color: [30, 100]',
        'state: "on"\nunknown: true',
    ],
)
def test_state_errors_have_block_locations(settings):
    text = "action: set_state\nentities:\n  light.sofa:\n" + "\n".join(
        "    " + line for line in settings.splitlines()
    )
    with pytest.raises(ProgramError) as err:
        parse_action_yaml(text)
    assert err.value.issues[0].path == ("entities", "light.sofa")
    assert err.value.issues[0].line == 4


@pytest.mark.parametrize(
    "block",
    [
        'action: set_state\nentities:\n  switch.a: {state: "on", brightness: 20}',
        'action: set_state\nentities:\n  cover.a: {state: "closed", position: 40}',
        "action: set_state\nentities:\n  cover.a: {position: 101}",
        'action: set_state\nentities:\n  cover.a: {state: "opening"}',
        "action: set_state\nentities:\n  cover.a: {position: 40, brightness: 20}",
        'action: set_state\nentities:\n  scene.a: {state: "on"}',
        'action: set_state\nentities:\n  light.a: {state: "on"}\n  light.a: {state: "off"}',
        "actions:\n  - action: turn_on\n    entities: [light.a]",
        "[]",
        "null",
        "action: turn_on\nentities: []",
        "- actions: [{action: turn_on, entities: [light.a]}]",
    ],
)
def test_invalid_blocks_rejected(block):
    with pytest.raises(ProgramError):
        parse_action_yaml(block)


def test_entity_order_canonical_but_action_order_significant():
    a = custom_program()
    data = program_data(a)
    mapping = data["steps"]["sunset"]["actions"][0]["entities"]
    data["steps"]["sunset"]["actions"][0]["entities"] = dict(reversed(mapping.items()))
    b = validate_program(data)
    assert program_revision(a) == program_revision(b)
    assert behavior_hash(a) == behavior_hash(b)
    data["steps"]["sunset"]["actions"].reverse()
    assert behavior_hash(validate_program(data)) != behavior_hash(a)


def test_action_limits_and_numeric_member_order():
    actions = [{"action": "scene.turn_on", "entities": [f"scene.s{i}"]} for i in range(12)]
    data = program_data(custom_program())
    data["steps"]["sunset"]["actions"] = actions
    plan = generate_plan(
        validate_program(data), date(2026, 10, 14), "order", context=PlanningContext("UTC")
    )
    assert [e.action.targets[0] for e in plan.events] == [f"scene.s{i}" for i in range(12)]
    data["steps"]["sunset"]["actions"] = actions * 9
    with pytest.raises(ProgramError):
        validate_program(data)
