"""Pure deterministic step planning; no HA reads or device calls."""

import hashlib
import json
import random
from collections.abc import Iterable
from dataclasses import dataclass, replace
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from .models import WEEKDAYS, Program, Step
from .time_utils import PlanningContext, SimulationDay
from .validation import (
    Issue,
    ProgramError,
    behavior_hash,
    program_revision,
    step_order,
    validate_program,
)

PLANNER_VERSION = 5


class RandomStreams:
    def __init__(self, seed):
        self.seed = str(seed)

    def rng(self, *parts):
        value = json.dumps([self.seed, *parts], separators=(",", ":"))
        return random.Random(int.from_bytes(hashlib.sha256(value.encode()).digest()))


@dataclass(frozen=True)
class ResolvedAction:
    action: str
    targets: tuple[str, ...]
    data: dict[str, Any]
    resources: tuple[str, ...] = ()
    replay_safe: bool = False

    def to_dict(self):
        return {"action": self.action, "entities": list(self.targets), "data": self.data.copy()}


def resolve_actions(step: Step) -> tuple[ResolvedAction, ...]:
    names = (
        [step.action]
        if "." in step.action
        else sorted({f"{entity.split('.')[0]}.{step.action}" for entity in step.entities})
    )
    result = []
    for name in names:
        domain = name.split(".")[0]
        selected = (
            step.entities
            if "." in step.action
            else tuple(e for e in step.entities if e.startswith(domain + "."))
        )
        typed = name in {"light.turn_on", "light.turn_off", "switch.turn_on", "switch.turn_off"}
        for batch in (tuple([e]) for e in selected) if typed else (selected,):
            result.append(ResolvedAction(name, batch, dict(step.data), batch, typed))
    return tuple(result)


@dataclass(frozen=True)
class PlanEvent:
    id: str
    at: datetime
    source_id: str
    action: ResolvedAction
    sequence: int = 0
    kind: str = "step"

    @property
    def order_key(self):
        return self.at, 20, 1, self.source_id, self.sequence, self.id

    def to_dict(self, zone=None):
        return {
            "id": self.id,
            "time": self.at.isoformat(),
            "local_time": self.at.astimezone(zone).isoformat() if zone else self.at.isoformat(),
            "source_id": self.source_id,
            "kind": self.kind,
            "action": self.action.to_dict(),
        }


@dataclass(frozen=True)
class DailyPlan:
    simulation_date: date
    seed: str
    behavior_hash: str
    source_revision: str
    timezone: str
    start: datetime
    end: datetime
    events: tuple[PlanEvent, ...]
    step_times: dict[str, datetime]
    issues: tuple[Issue, ...] = ()
    planner_version: int = PLANNER_VERSION

    @property
    def feasible(self):
        return not any(i.severity == "error" for i in self.issues)

    def to_dict(self):
        return {
            "simulation_date": self.simulation_date.isoformat(),
            "seed": self.seed,
            "behavior_hash": self.behavior_hash,
            "source_revision": self.source_revision,
            "planner_version": self.planner_version,
            "timezone": self.timezone,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "feasible": self.feasible,
            "steps": {k: v.isoformat() for k, v in sorted(self.step_times.items())},
            "events": [e.to_dict(ZoneInfo(self.timezone)) for e in self.events],
            "issues": [i.to_dict() for i in self.issues],
        }


def generate_plan(
    program: Program, simulation_date: date, seed, *, context=None, source_revision=None
):
    program = validate_program(program)
    context = context or PlanningContext()
    issues, times, events = [], {}, []
    day = SimulationDay(program, simulation_date, context, issues)
    streams = RandomStreams(seed)
    for key in step_order(program):
        step = program.steps[key]
        path = ("steps", key, "timing")
        if not step.enabled or WEEKDAYS[simulation_date.weekday()] not in step.days:
            issues.append(
                Issue(
                    "step_skipped",
                    f"{key} is disabled or not selected for this date",
                    ("steps", key),
                    "info",
                )
            )
            continue
        source = step.timing.relative_to
        if source and source.step:
            if source.step not in times:
                issues.append(
                    Issue(
                        "anchor_skipped",
                        f"{source.step} did not occur; {key} skipped",
                        path + ("relative_to",),
                        "info",
                    )
                )
                continue
            bounds = (
                times[source.step] + timedelta(seconds=source.start_offset),
                times[source.step] + timedelta(seconds=source.latest_offset),
            )
        elif source:
            bounds = (
                day.sun_bounds(source, path + ("relative_to",))
                if source.sun
                else day.entity_bounds(source, path + ("relative_to",))
            )
        else:
            bounds = day.clock_bounds(step.timing.absolute_time, path + ("absolute_time",))
        if bounds is None:
            continue
        low, high = bounds
        start = (
            low
            + timedelta(
                seconds=streams.rng("step", key, "start").uniform(0, (high - low).total_seconds())
            )
            if low != high
            else low
        )
        times[key] = start
        for index, action in enumerate(resolve_actions(step)):
            events.append(
                PlanEvent(f"{simulation_date}:step:{key}:{index}", start, key, action, index)
            )
    identity = {
        "program": behavior_hash(program),
        "timezone": day.zone.key,
        "latitude": context.latitude,
        "longitude": context.longitude,
        "elevation": context.elevation,
    }
    return DailyPlan(
        simulation_date,
        streams.seed,
        hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest(),
        source_revision or program_revision(program),
        day.zone.key,
        day.start,
        day.end,
        tuple(sorted(events, key=lambda e: e.order_key)),
        times,
        tuple(issues),
    )


def preview_dates(program: Program, dates: Iterable[date], seed, *, context=None):
    dates = tuple(dates)
    if not 1 <= len(dates) <= 31:
        raise ProgramError([Issue("preview_dates", "Preview between one and 31 dates")])
    return tuple(
        generate_plan(
            program,
            day,
            hashlib.sha256(json.dumps([str(seed), day.isoformat()]).encode()).hexdigest(),
            context=context,
        )
        for day in dates
    )


def preview_calendar_dates(program, dates, seed, *, context=None):
    """Assemble actual local days from all bounded contributing source dates."""
    from .runtime_planning import MAX_CACHED_EVENTS, runtime_dates

    dates = tuple(dates)
    if not 1 <= len(dates) <= 31:
        raise ProgramError([Issue("preview_dates", "Preview between one and 31 dates")])
    sources = sorted({source for day in dates for source in runtime_dates(program, day)})
    maximum = sum(len(step.entities) for step in program.steps.values() if step.enabled)
    if len(sources) * maximum > MAX_CACHED_EVENTS:
        raise ProgramError([Issue("preview_budget", "Preview exceeds its bounded event budget")])
    plans = {}
    for index in range(0, len(sources), 31):
        plans.update(
            (plan.simulation_date, plan)
            for plan in preview_dates(program, sources[index : index + 31], seed, context=context)
        )
    events = tuple(
        sorted(
            (event for plan in plans.values() for event in plan.events),
            key=lambda event: event.order_key,
        )
    )
    return tuple(
        replace(
            plans[day],
            events=tuple(
                event for event in events if plans[day].start <= event.at < plans[day].end
            ),
        )
        for day in dates
    )
