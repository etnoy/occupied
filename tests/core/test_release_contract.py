"""Keep every shipped example and the published schema in the regular test gate."""

import json
from datetime import date, timedelta
from pathlib import Path

import pytest

from custom_components.occupied.file_config import export_yaml, load_yaml, read_program
from custom_components.occupied.models import Program
from custom_components.occupied.planner import generate_plan
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import behavior_hash

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize("path", sorted((ROOT / "examples").glob("*.yaml")), ids=lambda p: p.name)
def test_shipped_example_roundtrip_and_week_plan(path):
    program = read_program(path)
    assert behavior_hash(load_yaml(export_yaml(program))) == behavior_hash(program)
    for offset in range(7):
        plan = generate_plan(
            program,
            date(2026, 10, 13) + timedelta(days=offset),
            "release",
            context=PlanningContext("Europe/Stockholm", 59.3, 18.1),
        )
        assert plan.feasible, plan.issues


def test_published_schema_matches_models():
    expected = json.dumps(Program.model_json_schema(), indent=2)
    assert (ROOT / "schema" / "occupied.schema.json").read_text() == expected, (
        "Run python scripts/generate_schema.py"
    )
