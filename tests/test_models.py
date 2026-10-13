"""Strict GUI model, normalization, references, and compact round trips."""

import pytest

from custom_components.occupied.file_config import export_yaml, load_yaml
from custom_components.occupied.models import (
    controlled_entities,
    format_duration,
    parse_duration,
    projectable_lights,
)
from custom_components.occupied.validation import (
    ProgramError,
    behavior_hash,
    program_data,
    program_revision,
    rename_identifier,
    validate_program,
)


@pytest.mark.parametrize(
    "value,seconds",
    [
        ("10s", 10),
        ("20m", 1200),
        ("2h30m", 9000),
        ("-2h30m", -9000),
        ("1h0.1s", 3600.1),
        ("+30m", 1800),
    ],
)
def test_duration_roundtrip(value, seconds):
    assert parse_duration(value) == seconds
    assert parse_duration(format_duration(seconds)) == seconds


@pytest.mark.parametrize(
    "value", [10, True, None, "", "30", "1:30", "1d", "2m1h", "1h2h", "nan", "8h-2m"]
)
def test_invalid_duration(value):
    with pytest.raises(ValueError):
        parse_duration(value)


def test_compact_roundtrip(program_dict):
    p = validate_program(program_dict)
    text = export_yaml(p)
    assert behavior_hash(load_yaml(text)) == behavior_hash(p)
    assert export_yaml(load_yaml(text)) == text
    assert "routines:" not in text and "targets:" not in text and "lighting:" not in text
    assert "days:" not in text and "enabled:" not in text


@pytest.mark.parametrize(
    "field",
    [
        "routines",
        "lighting",
        "defaults",
        "activation",
        "policies",
        "day_boundary",
        "timezone",
        "location",
        "constraints",
    ],
)
def test_retired_program_fields_rejected(program_dict, field):
    with pytest.raises(ProgramError) as raised:
        validate_program(program_dict | {field: {}})
    assert raised.value.issues[0].path == (field,)


@pytest.mark.parametrize(
    "field",
    [
        "id",
        "when",
        "actions",
        "probability",
        "time_distribution",
        "allow_cross_boundary",
        "missing_anchor",
        "duration",
        "resources",
    ],
)
def test_retired_step_fields_rejected(program_dict, field):
    program_dict["steps"]["wake"][field] = {}
    with pytest.raises(ProgramError) as raised:
        validate_program(program_dict)
    assert raised.value.issues[0].path[:2] == ("steps", "wake")


@pytest.mark.parametrize(
    "source",
    [
        "schema_version: true\nname: House\n",
        "schema_version: 2\nname: House\n",
        "schema_version: 1\nname: House\nname: Other\n",
        "schema_version: 1\nname: !!python/object:danger House\n",
        "schema_version: 1\nname: House\nextra: &loop [*loop]\n",
        "schema_version: 1\nname: House\nsteps: {step: {}, step: {}}\n",
        "schema_version: 1\nname: House\nsteps: {step: {<<: {action: turn_on}}}\n",
    ],
)
def test_bad_yaml(source):
    with pytest.raises(ProgramError) as raised:
        load_yaml(source)
    assert raised.value.issues[0].line


def test_field_locations(program_dict):
    with pytest.raises(ProgramError) as raised:
        load_yaml(export_yaml(validate_program(program_dict)).replace("06:40", "25:00"))
    issue = raised.value.issues[0]
    assert issue.path == ("steps", "wake", "timing", "absolute_time", "start")
    assert issue.line and issue.column


def test_names_and_order_only_change_source_revision(program_dict):
    original = validate_program(program_dict)
    program_dict["name"] = "New"
    program_dict["steps"]["wake"]["name"] = "Changed title"
    program_dict["steps"] = dict(reversed(program_dict["steps"].items()))
    changed = validate_program(program_dict)
    assert behavior_hash(original) == behavior_hash(changed)
    assert program_revision(original) != program_revision(changed)


def test_equivalent_defaults_and_clocks_hash_equally(program_dict):
    original = validate_program(program_dict)
    for step in program_dict["steps"].values():
        step.update(enabled=True, days=["sun", "mon", "tue", "wed", "thu", "fri", "sat"])
    program_dict["steps"]["wake"]["timing"]["absolute_time"].update(
        start="06:40:00", end="07:20:00"
    )
    assert behavior_hash(original) == behavior_hash(validate_program(program_dict))


def test_fixed_end_and_offsets_normalize(program_dict):
    program_dict["steps"]["wake"]["timing"] = {
        "absolute_time": {"start": "18:00:00", "end": "18:00"}
    }
    program_dict["steps"]["leave"]["timing"] = {
        "relative_to": {"step": "wake", "start_offset": "0s", "end_offset": "0s"}
    }
    text = export_yaml(validate_program(program_dict))
    assert "end:" not in text and "end_offset" not in text and "start_offset" not in text


def test_atomic_rename_preserves_opaque_data(program_dict):
    program_dict["steps"]["wake"].update(
        action="script.turn_on", entities=["script.test"], data={"variables": {"step": "wake"}}
    )
    original = validate_program(program_dict)
    renamed = rename_identifier(original, "step", "wake", "morning")
    assert renamed.steps["leave"].timing.relative_to.step == "morning"
    assert renamed.steps["morning"].data["variables"]["step"] == "wake"
    assert "wake" in original.steps
    with pytest.raises(ProgramError):
        rename_identifier(original, "step", "wake", "leave")
    with pytest.raises(ProgramError):
        rename_identifier(original, "routine", "wake", "other")


@pytest.mark.parametrize(
    "relative",
    [
        {"step": "unknown"},
        {"step": "leave"},
        {"sun": "sunrise", "step": "wake"},
        {"entity": "calendar.work"},
        {"sun": "sunset", "start_offset": "1h", "end_offset": "-1h"},
    ],
)
def test_bad_dependencies_and_sources(program_dict, relative):
    program_dict["steps"]["leave"]["timing"] = {"relative_to": relative}
    with pytest.raises(ProgramError):
        validate_program(program_dict)


def test_weekday_dependencies(program_dict):
    program_dict["steps"]["wake"]["days"] = ["mon"]
    with pytest.raises(ProgramError) as raised:
        validate_program(program_dict)
    assert raised.value.issues[0].code == "anchor_days"


def test_entities_derived_from_enabled_typed_actions(program_dict):
    program_dict["steps"]["opaque"] = {
        "timing": {"absolute_time": {"start": "19:00"}},
        "action": "scene.turn_on",
        "entities": ["scene.evening"],
    }
    program_dict["steps"]["leave"]["enabled"] = False
    p = validate_program(program_dict)
    assert controlled_entities(p) == {"light.a", "light.b", "scene.evening"}
    assert projectable_lights(p) == {"light.a", "light.b"}


@pytest.mark.parametrize(
    "action,entities,data",
    [
        ("turn_on", ["remote.tv"], {}),
        ("turn_on", ["light.a"], {"brightness_pct": 50}),
        ("light.turn_on", ["switch.a"], {}),
        ("switch.turn_on", ["switch.a"], {"brightness": 1}),
        ("light.turn_on", ["light.a"], {"brightness": 0}),
        ("scene.turn_on", ["scene.a", "scene.b"], {}),
        ("script.turn_on", ["script.a"], {"entity_id": "light.a"}),
    ],
)
def test_action_contract(program_dict, action, entities, data):
    program_dict["steps"]["wake"].update(action=action, entities=entities, data=data)
    with pytest.raises(ProgramError):
        validate_program(program_dict)


def test_optional_title_and_disabled_state(program_dict):
    program_dict["steps"]["wake"].update(name="  ", enabled=False)
    p = validate_program(program_dict)
    assert p.steps["wake"].name is None
    assert program_data(p)["steps"]["wake"]["enabled"] is False


def test_generic_service_data_rejects_nonfinite_json(program_dict):
    program_dict["steps"]["wake"].update(
        action="script.turn_on", entities=["script.test"], data={"value": float("nan")}
    )
    with pytest.raises(ProgramError) as raised:
        validate_program(program_dict)
    assert raised.value.issues[0].path == ("steps", "wake", "data")
