"""Canonical backend draft operations shared with the offline CLI/model."""

import hashlib
import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from .covers import project_covers
from .file_config import export_yaml, load_program
from .lighting import preview_handover, project_lighting
from .models import Program, program_timings
from .planner import DailyPlan, preview_calendar_dates
from .time_utils import PlanningContext
from .validation import (
    behavior_hash,
    program_data,
    program_revision,
    rename_identifier,
    validation_warnings,
)


@dataclass(frozen=True)
class PreviewInputs:
    """A read-only snapshot, captured under the controller lock before planning."""

    program: Program
    seed: str | int
    context: PlanningContext
    source_plans: tuple[DailyPlan, ...] = ()

    def render(self, start, days, at=None):
        result = preview_draft(
            self.program, start, days, self.seed, self.context, at, source_plans=self.source_plans
        )
        result["program"] = program_data(self.program)
        return result


def planning_identity(program, context):
    """Only sources used by this draft participate in planning freshness checks."""
    entities = {
        source.entity
        for _, timing in program_timings(program)
        if (source := timing.relative_to) and source.entity
    }
    return [
        context.timezone,
        context.latitude,
        context.longitude,
        context.elevation,
        {entity: context.time_sources.get(entity) for entity in sorted(entities)},
    ]


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
    *,
    source_plans: tuple[DailyPlan, ...] = (),
) -> dict[str, Any]:
    program = load_program(source)
    if not 1 <= days <= 31:
        raise ValueError("Preview between one and 31 schedule dates")
    plans = preview_calendar_dates(
        program,
        [start + timedelta(days=index) for index in range(days)],
        seed,
        context=context,
        source_plans=source_plans,
    )
    result = {
        "valid": all(plan.feasible for plan in plans),
        "behavior_hash": behavior_hash(program),
        "plans": [plan.to_dict() for plan in plans],
    }
    result["plan_fingerprint"] = hashlib.sha256(
        json.dumps(
            {
                "version": 1,
                "revision": program_revision(program),
                "seed": str(seed),
                "context": planning_identity(program, context),
                "plans": [plan["plan_fingerprint"] for plan in result["plans"]],
            },
            sort_keys=True,
            separators=(",", ":"),
        ).encode()
    ).hexdigest()
    if at is not None:
        plan = next(
            (plan for plan in plans if at.tzinfo is not None and plan.start <= at <= plan.end), None
        )
        if plan is None:
            raise ValueError("Projection instant must be aware and within the preview dates")
        result["lighting"] = {
            entity: state.to_dict() for entity, state in project_lighting(program, plan, at).items()
        }
        result["covers"] = {
            entity: state.to_dict() for entity, state in project_covers(program, plan, at).items()
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
