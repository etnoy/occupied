"""Combined-feature fixtures exercise the shipped editor and actual planner."""

import json
import subprocess
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import pytest

from custom_components.occupied.file_config import (
    export_yaml,
    load_program,
    load_yaml,
    read_program,
)
from custom_components.occupied.planner import generate_plan
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import behavior_hash, program_data

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "tests" / "fixtures" / "programs"
EDITOR_ROUNDTRIPS = """
import { readFileSync } from 'node:fs';
import { buildStep, stepEditor, stepEntries } from
  './custom_components/occupied/frontend/dist/lib/models/step-model.js';
const program = JSON.parse(readFileSync(0, 'utf8'));
console.log(JSON.stringify(stepEntries(program).map(entry => ({
  id: entry.id,
  program: buildStep(program, stepEditor(program, entry)),
}))));
"""


@pytest.mark.parametrize("fixture_name", ["gui-house.yaml", "scheduling-edge-cases.yaml"])
def test_every_fixture_step_roundtrips_through_shipped_editor(fixture_name):
    program = read_program(FIXTURES / fixture_name)
    exported = export_yaml(program)
    assert export_yaml(load_yaml(exported)) == exported
    result = subprocess.run(
        ["node", "--input-type=module", "-e", EDITOR_ROUNDTRIPS],
        input=json.dumps(program_data(program)),
        capture_output=True,
        text=True,
        check=True,
        cwd=ROOT,
        timeout=15,
    )
    edited = json.loads(result.stdout)
    assert [entry["id"] for entry in edited] == list(program.steps)
    for entry in edited:
        reopened = load_program(entry["program"])
        assert behavior_hash(reopened) == behavior_hash(program), entry["id"]
        assert program_data(reopened) == program_data(program), entry["id"]


def test_complex_fixture_resolves_all_sources_and_skips_disabled_chain():
    program = read_program(FIXTURES / "gui-house.yaml")
    context = PlanningContext(
        "UTC",
        59.3,
        18.1,
        time_sources={
            "input_datetime.evening": {"kind": "time", "state": "18:00:15"},
            "sensor.next_alarm": {"kind": "timestamp", "state": "2026-10-12T07:00:00+00:00"},
            "calendar.work": {
                "kind": "calendar",
                "start_time": "2026-10-12T08:00:00+00:00",
                "end_time": "2026-10-12T17:00:00+00:00",
            },
        },
    )
    plan = generate_plan(program, date(2026, 10, 12), "fixture", context=context)
    assert plan.feasible
    assert set(plan.step_times) == set(program.steps) - {"disabled_parent", "disabled_child"}
    assert any(issue.code == "anchor_skipped" for issue in plan.issues)
    for key, anchor in (
        ("time_helper", datetime(2026, 10, 12, 18, 0, 15, tzinfo=UTC)),
        ("timestamp_sensor", datetime(2026, 10, 12, 7, tzinfo=UTC)),
        ("calendar_start", datetime(2026, 10, 12, 8, tzinfo=UTC)),
        ("calendar_end", datetime(2026, 10, 12, 17, tzinfo=UTC)),
    ):
        assert (
            anchor - timedelta(minutes=10) <= plan.step_times[key] <= anchor + timedelta(minutes=5)
        )
    assert plan.step_times["overnight_child"].date() == date(2026, 10, 13)
    assert plan.step_times["overnight_grandchild"] == plan.step_times[
        "overnight_child"
    ] - timedelta(seconds=10)
    payload = next(
        event.action.data for event in plan.events if event.source_id == "opaque_service"
    )
    assert payload["variables"]["sequence"] == ["second", "first"]
    assert payload["variables"]["options"] == {"active": True, "level": 2.5, "empty": None}


def test_edge_fixture_normalizes_bounds_and_obeys_source_weekdays():
    program = read_program(FIXTURES / "scheduling-edge-cases.yaml")
    step = program.steps["fixed_equal_bounds"]
    assert step.name is None
    assert step.days == ("mon", "sun")
    assert step.entities == ("light.a", "switch.z")
    assert step.timing.absolute_time.end is None
    assert program.steps["child_before_parent"].timing.relative_to.end_offset is None
    assert program.steps["zero_offset"].timing.relative_to.start_offset == 0
    context = PlanningContext("UTC", 59.3, 18.1)
    monday = generate_plan(program, date(2026, 10, 12), "fixture", context=context)
    assert monday.feasible
    assert monday.step_times["child_before_parent"] == datetime(2026, 10, 13, 0, 0, 15, tzinfo=UTC)
    assert monday.step_times["negative_offset"] == datetime(2026, 10, 11, 23, 59, 45, tzinfo=UTC)
    assert monday.step_times["zero_offset"] == monday.step_times["fixed_equal_bounds"]
    assert "disjoint_child" not in monday.step_times
    tuesday = generate_plan(program, date(2026, 10, 13), "fixture", context=context)
    assert tuesday.feasible
    assert {"late_parent", "child_before_parent", "negative_offset", "disjoint_child"}.isdisjoint(
        tuesday.step_times
    )
    assert sum(issue.code == "anchor_skipped" for issue in tuesday.issues) >= 2
