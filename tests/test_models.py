"""Schema, diagnostics, inheritance, identity, and canonical YAML round trips."""

from copy import deepcopy

import pytest

from custom_components.occupied.file_config import export_yaml, load_yaml
from custom_components.occupied.models import format_duration, merge_defaults, parse_duration
from custom_components.occupied.validation import (
    ProgramError,
    behavior_hash,
    program_data,
    rename_identifier,
    resolve_targets,
    validate_program,
)


@pytest.mark.parametrize(
    "value, seconds",
    [
        ("10s", 10),
        ("20m", 1200),
        ("2h30m", 9000),
        ("-2h30m", -9000),
        ("1h0.1s", 3600.1),
        ("+30m", 1800),
    ],
)
def test_explicit_duration_roundtrip(value, seconds):
    assert parse_duration(value) == seconds
    assert parse_duration(format_duration(seconds)) == seconds


@pytest.mark.parametrize(
    "value", [10, True, None, "", "30", "1:30", "1d", "2m1h", "1h2h", "nan", "8h-2m"]
)
def test_invalid_duration_units(value):
    with pytest.raises(ValueError):
        parse_duration(value)


def test_yaml_roundtrip_preserves_shared_defaults_and_behavior(program_dict):
    program_dict["defaults"] = {
        "time_distribution": "triangular",
        "activity_windows": {"min_gap": "4m"},
    }
    program_dict["routines"][0]["defaults"] = {
        "activity_windows": {"on_duration": {"min": "2m", "max": "8m"}}
    }
    program = validate_program(program_dict)
    exported = export_yaml(program)
    imported = load_yaml(exported)
    assert program_data(imported) == program_data(program)
    assert behavior_hash(imported) == behavior_hash(program)
    defaults = merge_defaults(program, program.routines[0])
    assert defaults.time_distribution == "triangular"
    assert defaults.activity_windows.min_gap == 240
    assert defaults.activity_windows.on_duration.lower == 120
    assert program.routines[0].activity_windows[0].min_gap == 600  # Item override.
    assert "defaults:" in exported


def test_duplicate_key_has_line_and_model_path():
    with pytest.raises(ProgramError) as raised:
        load_yaml(
            "schema_version: 1\nname: House\nlighting:\n  handover:\n"
            "    duration: 10m\n    duration: 5m\n"
        )
    issue = raised.value.issues[0]
    assert issue.code == "duplicate_key"
    assert issue.path == ("lighting", "handover", "duration")
    assert issue.line == 6


def test_unknown_field_has_line_and_model_path():
    with pytest.raises(ProgramError) as raised:
        load_yaml("schema_version: 1\nname: House\nlighting:\n  default_brightnes: 70\n")
    issue = raised.value.issues[0]
    assert issue.path == ("lighting", "default_brightnes")
    assert issue.line == 4


@pytest.mark.parametrize(
    "source",
    [
        "[]",
        "",
        "schema_version: 1\nname: House\nname: Other\n",
        "schema_version: 2\nname: House\n",
        "schema_version: true\nname: House\n",
        "schema_version: 1\nname: House\nactivation:\n  conditions:\n"
        "    - condition: state\n      entity_id: input_boolean.away\n      state: on\n",
        "schema_version: 1\nname: House\nextra: &loop [*loop]\n",
        "schema_version: 1\nname: !!python/object:danger House\n",
    ],
)
def test_invalid_and_unsafe_yaml_is_rejected(source):
    with pytest.raises(ProgramError):
        load_yaml(source)


@pytest.mark.parametrize("kind", ["group", "routine", "step", "activity", "window"])
def test_ids_are_unique_across_resource_kind(program_dict, kind):
    field = {
        "group": "groups",
        "routine": "routines",
        "step": "steps",
        "activity": "activities",
        "window": "activity_windows",
    }[kind]
    container = program_dict if kind in {"group", "routine"} else program_dict["routines"][0]
    container[field].append(deepcopy(container[field][0]))
    with pytest.raises(ProgramError) as raised:
        validate_program(program_dict)
    assert any(issue.code == "duplicate_id" for issue in raised.value.issues)


def test_reference_graph_and_selected_days(program_dict):
    program_dict["routines"][0]["steps"][0]["when"] = {
        "relative_to": "leave",
        "offset_range": {"fixed": "1m"},
    }
    with pytest.raises(ProgramError) as raised:
        validate_program(program_dict)
    assert raised.value.issues[0].code == "reference_cycle"
    program_dict["routines"][0]["steps"][0]["when"]["relative_to"] = "missing"
    with pytest.raises(ProgramError) as raised:
        validate_program(program_dict)
    assert any(issue.code == "dangling_step" for issue in raised.value.issues)


def test_weekday_dependency_can_be_explicitly_skipped(program_dict):
    program_dict["routines"][0]["steps"][0]["days"] = ["mon"]
    with pytest.raises(ProgramError) as raised:
        validate_program(program_dict)
    assert any(issue.code == "anchor_days" for issue in raised.value.issues)
    program_dict["routines"][0]["steps"][1]["missing_anchor"] = "skip"
    validate_program(program_dict)


@pytest.mark.parametrize(
    "change",
    [
        {"days": []},
        {"days": ["funday"]},
        {"probability": 1.1},
    ],
)
def test_invalid_item_settings(program_dict, change):
    program_dict["routines"][0]["steps"][0].update(change)
    with pytest.raises(ProgramError):
        validate_program(program_dict)


@pytest.mark.parametrize(
    "action",
    [
        {"action": "turn_on", "targets": {"entities": ["remote.harmony"]}},
        {
            "action": "turn_on",
            "targets": {"entities": ["light.a"]},
            "data": {"brightness_pct": 101},
        },
        {
            "action": "turn_off",
            "targets": {"entities": ["light.a"]},
            "data": {"brightness_pct": 30},
        },
        {
            "action": "turn_on",
            "targets": {"entities": ["switch.a"]},
            "data": {"brightness_pct": 30},
        },
        {"action": "light.turn_on", "targets": {"entities": ["switch.a"]}},
        {"action": "toggle", "targets": {"entities": ["light.a"]}},
        {"action": "remote.turn_on", "data": {"entity_id": "remote.harmony"}},
    ],
)
def test_invalid_typed_and_generic_targets(program_dict, action):
    program_dict["routines"][0]["steps"][0]["actions"] = [action]
    with pytest.raises(ProgramError):
        validate_program(program_dict)


def test_stable_behavior_hash_ignores_labels_and_resource_order(program_dict):
    original = validate_program(program_dict)
    reordered = deepcopy(program_dict)
    reordered["name"] = "Hus"
    reordered["groups"][0]["name"] = "Rum åäö"
    reordered["groups"][0]["entities"].reverse()
    reordered["routines"][0]["steps"].reverse()
    for step in reordered["routines"][0]["steps"]:
        step["name"] += " renamed"
    assert behavior_hash(original) == behavior_hash(validate_program(reordered))
    reordered["routines"][0]["steps"][1]["actions"][0]["data"]["brightness_pct"] = 80
    assert behavior_hash(original) != behavior_hash(validate_program(reordered))


def test_ordered_action_list_and_opaque_data_are_behavior(program_dict):
    step = program_dict["routines"][0]["steps"][0]
    step["actions"].append(
        {
            "action": "script.turn_on",
            "targets": {"entities": ["script.proof"]},
            "data": {"name": "original", "relative_to": "wake"},
        }
    )
    original = validate_program(program_dict)
    reordered = deepcopy(program_dict)
    reordered["routines"][0]["steps"][0]["actions"].reverse()
    assert behavior_hash(original) != behavior_hash(validate_program(reordered))
    changed = deepcopy(program_dict)
    changed["routines"][0]["steps"][0]["actions"][1]["data"]["name"] = "changed"
    assert behavior_hash(original) != behavior_hash(validate_program(changed))
    migrated = rename_identifier(original, "step", "wake", "morning")
    assert migrated.routines[0].steps[1].when.relative_to == "morning"
    assert migrated.routines[0].steps[0].actions[1].data["relative_to"] == "wake"
    assert original.routines[0].steps[0].id == "wake"


def test_identifier_migration_rewrites_group_and_all_anchor_kinds(program_dict):
    routine = program_dict["routines"][0]
    routine["activity_windows"][0]["between"]["start"] = {"step": "wake"}
    routine["activities"][0]["when"] = {"relative_to": "wake", "offset_range": {"fixed": "1h"}}
    routine["activities"][0]["within"] = {"start": {"step": "wake"}, "end": {"clock": "12:00"}}
    program = validate_program(program_dict)
    changed = rename_identifier(program, "step", "wake", "morning")
    assert changed.routines[0].activities[0].when.relative_to == "morning"
    assert changed.routines[0].activities[0].within.start.step == "morning"
    assert changed.routines[0].activity_windows[0].between.start.step == "morning"
    changed = rename_identifier(changed, "group", "room", "lounge")
    assert changed.lighting.managed_targets.groups == ("lounge",)
    assert changed.lighting.baseline[0].targets.groups == ("lounge",)
    assert changed.routines[0].steps[0].actions[0].targets.groups == ("lounge",)
    assert changed.routines[0].activity_windows[0].targets.groups == ("lounge",)


def test_failed_identifier_migration_is_atomic(program_dict):
    program = validate_program(program_dict)
    before = program_data(program)
    for kind, old, new in [
        ("step", "wake", "leave"),
        ("group", "room", "Bad ID"),
        ("step", "missing", "morning"),
    ]:
        with pytest.raises(ProgramError):
            rename_identifier(program, kind, old, new)
        assert program_data(program) == before


def test_targets_deduplicate_group_and_entity_sources(program_dict):
    program_dict["routines"][0]["steps"][0]["actions"][0]["targets"]["entities"] = [
        "light.b",
        "light.b",
        "light.c",
    ]
    program = validate_program(program_dict)
    assert resolve_targets(program, program.routines[0].steps[0].actions[0].targets) == (
        "light.a",
        "light.b",
        "light.c",
    )
