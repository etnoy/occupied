"""Compact deterministic plan provenance instead of repeating full event arrays."""

import logging
from dataclasses import asdict, replace
from datetime import date

from .plan_codec import PlannerVersionChanged
from .planner import PLANNER_VERSION, generate_plan, supersede_ticks
from .time_sources import source_entities
from .time_utils import PlanningContext

_LOGGER = logging.getLogger(__name__)


def plan_context(program, context):
    data = asdict(context)
    entities = source_entities(program)
    data["time_sources"] = {
        entity: source for entity, source in data["time_sources"].items() if entity in entities
    }
    if "time_source_latches" in data:
        data["time_source_latches"] = {
            day: {entity: source for entity, source in values.items() if entity in entities}
            for day, values in data["time_source_latches"].items()
        }
    return data


def plan_fingerprint(plan, context):
    return {
        "simulation_date": plan.simulation_date.isoformat(),
        "seed": plan.seed,
        "source_revision": plan.source_revision,
        "planner_version": plan.planner_version,
        "fingerprint": plan.to_dict()["plan_fingerprint"],
        "context": context,
    }


def restore_plan_fingerprints(program, records):
    """Regenerate caches from saved contexts, tolerating fingerprint drift."""
    plans = {}
    for record in records:
        version = record["planner_version"]
        if type(version) is not int:
            raise ValueError("Unsupported saved planner version")
        if version != PLANNER_VERSION:
            raise PlannerVersionChanged(
                f"Saved planner version {version} differs from {PLANNER_VERSION}; rebuilding plans"
            )
        day = date.fromisoformat(record["simulation_date"])
        if day in plans:
            raise ValueError("Duplicate saved plan date")
        plans[day] = generate_plan(
            program,
            day,
            record["seed"],
            context=PlanningContext(**record["context"]),
            source_revision=record["source_revision"],
        )
    # The runtime can supersede stagger ticks across adjacent source dates.
    # A snapshot before queue construction still has the original per-date form.
    resolved = {
        event.id: event
        for event in supersede_ticks(event for plan in plans.values() for event in plan.events)
    }
    for record in records:
        day = date.fromisoformat(record["simulation_date"])
        plan = plans[day]
        if plan.to_dict()["plan_fingerprint"] != record["fingerprint"]:
            superseded = replace(plan, events=tuple(resolved[event.id] for event in plan.events))
            if superseded.to_dict()["plan_fingerprint"] == record["fingerprint"]:
                plans[day] = superseded
            else:
                _LOGGER.info(
                    "Occupied %s, saved plan %s: fingerprint differs from saved provenance; "
                    "using the plan regenerated from its saved context",
                    program.name,
                    day,
                )
    return plans
