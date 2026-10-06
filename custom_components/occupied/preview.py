"""Canonical backend draft operations shared with the offline CLI/model."""

from datetime import date, datetime, timedelta
from typing import Any

from .file_config import export_yaml, load_program
from .lighting import preview_handover, project_lighting
from .planner import preview_dates
from .time_utils import PlanningContext
from .validation import behavior_hash, program_data, rename_identifier, validation_warnings


def validate_draft(source) -> dict[str, Any]:
    program = load_program(source)
    return {
        "program": program_data(program),
        "behavior_hash": behavior_hash(program),
        "issues": [issue.to_dict() for issue in validation_warnings(program)],
    }


def preview_draft(
    source,
    start: date,
    days: int,
    seed: str | int,
    context: PlanningContext,
    at: datetime | None = None,
) -> dict[str, Any]:
    program = load_program(source)
    if not 1 <= days <= 31:
        raise ValueError("Preview between one and 31 simulation dates")
    plans = preview_dates(
        program, [start + timedelta(days=index) for index in range(days)], seed, context=context
    )
    result = {
        "valid": all(plan.feasible for plan in plans),
        "behavior_hash": behavior_hash(program),
        "plans": [plan.to_dict() for plan in plans],
    }
    if at is not None:
        plan = next(
            (plan for plan in plans if at.tzinfo is not None and plan.start <= at <= plan.end), None
        )
        if plan is None:
            raise ValueError("Projection instant must be aware and within the preview dates")
        result["lighting"] = {
            entity: state.to_dict() for entity, state in project_lighting(program, plan, at).items()
        }
        result["handover"] = preview_handover(program, plan, at)
    return result


def export_draft(source) -> dict[str, Any]:
    program = load_program(source)
    return {"yaml": export_yaml(program), "behavior_hash": behavior_hash(program)}


def rename_draft(source, kind: str, old: str, new: str) -> dict[str, Any]:
    program = rename_identifier(load_program(source), kind, old, new)
    return {
        "program": program_data(program),
        "yaml": export_yaml(program),
        "behavior_hash": behavior_hash(program),
    }
