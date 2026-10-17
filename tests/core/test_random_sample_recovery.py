"""Random samples may skip an item without stopping unrelated daily work."""

from copy import deepcopy
from datetime import date, timedelta
from pathlib import Path

from custom_components.occupied.file_config import load_yaml
from custom_components.occupied.planner import generate_plan, preview_dates
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import program_data, validate_program

CTX = PlanningContext("UTC", 59.3, 18.1)


def sampled_program():
    root = Path(__file__).resolve().parents[2]
    return program_data(
        load_yaml((root / "tests/fixtures/programs/resilient-samples.yaml").read_text())
    )


def test_a_month_of_samples_keeps_unrelated_steps_and_reports_skips():
    program = validate_program(sampled_program())
    skips = 0
    dates = [date(2026, 1, 1) + timedelta(days=offset) for offset in range(31)]
    for plan in preview_dates(program, dates, 0, context=CTX):
        assert plan.feasible
        assert len([event for event in plan.events if event.source_id == "always"]) == 1
        failures = [issue for issue in plan.issues if issue.code == "random_window"]
        assert all(issue.severity == "warning" for issue in failures)
        if failures:
            skips += 1
            assert not any(event.source_id == "evening" for event in plan.events)
    assert skips > 0


def test_unsampled_bounds_warn_even_on_samples_that_fit():
    program = validate_program(sampled_program())
    good = 0
    for seed in range(20):
        plan = generate_plan(program, date(2026, 1, 1), seed, context=CTX)
        assert any(
            issue.code == "random_window_risk" and issue.severity == "warning"
            for issue in plan.issues
        )
        if any(event.source_id == "evening" for event in plan.events):
            good += 1
    assert good > 0


def test_structurally_impossible_duration_is_rejected_independently_of_zero_sampling():
    data = sampled_program()
    data["random"]["evening"].update(
        end={"duration": {"min": "1m", "max": "2m"}}, count={"min": 0, "max": 1}
    )
    program = validate_program(data)
    for seed in range(20):
        plan = generate_plan(program, date(2026, 1, 1), seed, context=CTX)
        assert not plan.feasible
        assert any(
            issue.code == "random_window" and issue.severity == "error" for issue in plan.issues
        )
        assert not any(event.source_id == "evening" for event in plan.events)
    disabled = deepcopy(data)
    disabled["random"]["evening"]["count"] = 0
    assert generate_plan(validate_program(disabled), date(2026, 1, 1), 0, context=CTX).feasible


def test_an_inverted_timestamp_sample_is_a_warning_skip():
    data = sampled_program()
    data["random"]["evening"].update(
        start={"absolute_time": {"start": "18:00"}},
        end={"relative_to": {"entity": "sensor.window_end"}},
    )
    context = PlanningContext(
        "UTC",
        time_sources={
            "sensor.window_end": {"kind": "timestamp", "state": "2026-01-01T17:00:00+00:00"}
        },
    )
    plan = generate_plan(validate_program(data), date(2026, 1, 1), 0, context=context)
    assert plan.feasible
    assert any(
        issue.code == "random_window" and issue.severity == "warning" for issue in plan.issues
    )
    assert [event.source_id for event in plan.events] == ["always"]


def test_valid_overnight_window_is_still_feasible():
    data = sampled_program()
    data["random"]["evening"].update(
        start={"absolute_time": {"start": "22:00"}},
        end={"absolute_time": {"start": "02:00"}},
    )
    plan = generate_plan(validate_program(data), date(2026, 1, 1), 0, context=CTX)
    assert plan.feasible
    assert len([event for event in plan.events if event.source_id == "evening"]) == 2
    assert not any(issue.code.startswith("random_window") for issue in plan.issues)
