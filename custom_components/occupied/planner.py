"""Pure deterministic step planning; no HA reads or device calls."""

import hashlib
import json
import random
from bisect import bisect_right
from collections.abc import Iterable
from dataclasses import dataclass, replace
from datetime import date, datetime, timedelta
from functools import cached_property
from typing import Any
from zoneinfo import ZoneInfo

from .models import WEEKDAYS, Action, Program, format_duration, max_plan_events
from .time_utils import PlanningContext, SimulationDay
from .validation import (
    Issue,
    ProgramError,
    behavior_hash,
    early_cap_warning,
    program_revision,
    random_order,
    step_order,
    validate_program,
    validation_warnings,
)

PLANNER_VERSION = 14


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


def resolve_actions(step: Action) -> tuple[ResolvedAction, ...]:
    if step.actions is not None:
        return tuple(
            action for configured in step.actions for action in resolve_actions(configured)
        )
    if step.action == "set_state":
        result = []
        for entity, settings in step.entities.items():
            domain = entity.split(".")[0]
            data = {key: value for key, value in settings.items() if key != "state"}
            if domain == "cover":
                name = (
                    "cover.set_cover_position"
                    if "position" in data
                    else (
                        "cover.open_cover" if settings["state"] == "open" else "cover.close_cover"
                    )
                )
            else:
                name = f"{domain}.turn_{settings['state']}"
            result.append(
                ResolvedAction(name, (entity,), data, (entity,), domain in {"light", "switch"})
            )
        return tuple(result)
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
    custom: bool = False
    scheduled: bool = False
    authored_at: datetime | None = None
    configured_index: int = 0
    tick: int = 0
    tick_count: int = 0
    period: float = 0
    superseded: bool = False

    @property
    def group_id(self):
        """One execution instant; staggered occurrences have one group per tick."""
        return (
            f"{self.occurrence_id}@{self.at.isoformat()}" if self.scheduled else self.occurrence_id
        )

    @property
    def occurrence_id(self):
        """The parent authored occurrence/phase, independent of ticks and service batches."""
        return self.id.rsplit(":", 1)[0]

    @property
    def order_key(self):
        return (
            self.at,
            20,
            1,
            self.source_id,
            self.sequence,
            int(self.id.rsplit(":", 1)[1]),
            self.id,
        )

    def to_dict(self, zone=None):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "source_date": self.id.split(":", 1)[0],
            "action_index": int(self.id.rsplit(":", 1)[1]),
            "time": self.at.isoformat(),
            "local_time": self.at.astimezone(zone).isoformat() if zone else self.at.isoformat(),
            "source_id": self.source_id,
            "kind": self.kind,
            "sequence": self.sequence,
            "custom": self.custom,
            "action": self.action.to_dict(),
            **(
                {
                    "scheduled": True,
                    "occurrence_id": self.occurrence_id,
                    "authored_at": self.authored_at.isoformat(),
                    "configured_index": self.configured_index,
                    "tick": self.tick,
                    "tick_count": self.tick_count,
                    "period_seconds": self.period,
                    "superseded": self.superseded,
                }
                if self.scheduled
                else {}
            ),
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
    # Preview-only context: never dispatched or included in executable groups.
    history_events: tuple[PlanEvent, ...] = ()
    future_events: tuple[PlanEvent, ...] = ()

    @cached_property
    def groups(self):
        groups = {}
        for event in self.events:
            groups.setdefault(event.group_id, []).append(event)
        return {key: tuple(events) for key, events in groups.items()}

    @cached_property
    def occurrences(self):
        groups = {}
        for event in self.events:
            groups.setdefault(event.occurrence_id, []).append(event)
        return {key: tuple(events) for key, events in groups.items()}

    @property
    def feasible(self):
        return not any(i.severity == "error" for i in self.issues)

    def to_dict(self):
        result = {
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
        if self.history_events:
            result["history_events"] = [
                e.to_dict(ZoneInfo(self.timezone)) for e in self.history_events
            ]
        if self.future_events:
            result["future_events"] = [
                e.to_dict(ZoneInfo(self.timezone)) for e in self.future_events
            ]
        result["plan_fingerprint"] = hashlib.sha256(
            json.dumps(result, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        return result


def occurrence_groups(plan):
    """Keep planner member order; equal-time unrelated occurrences stay separate."""
    return tuple(sorted(plan.groups.values(), key=lambda events: events[0].order_key))


def plan_actions(block, start, prefix, source_id, streams, *, sequence=None, kind="step"):
    """One shuffle per authored action, followed by fixed, equally spaced ticks."""
    events, offset, index = [], 0, 0
    scheduled = block.stagger_span > 0
    custom = block.actions is not None or block.action == "set_state"
    for configured_index, configured in enumerate(block.configured_actions()):
        authored = start + timedelta(seconds=offset)
        resolved = list(enumerate(resolve_actions(configured), start=index))
        index += len(resolved)
        if configured.stagger.enabled:
            # Canonical IDs survive permutation changes; only execution order is shuffled.
            streams.rng("stagger", prefix, configured_index).shuffle(resolved)
        count = len(resolved)
        for position, (member_index, action) in enumerate(resolved):
            tick = position + 1 if configured.stagger.enabled else 0
            period = configured.stagger.period if tick else 0
            at = authored + timedelta(seconds=period * tick / count if tick else 0)
            events.append(
                PlanEvent(
                    f"{prefix}:{member_index}",
                    at,
                    source_id,
                    action,
                    member_index if sequence is None else sequence,
                    kind,
                    custom,
                    scheduled,
                    authored if scheduled else None,
                    configured_index if scheduled else 0,
                    tick,
                    count if tick else 0,
                    period,
                )
            )
        if configured.stagger.enabled:
            offset += configured.stagger.period
    return events


def supersede_ticks(events):
    """A newer direct intent cancels older ticks, including across source dates."""
    events = tuple(events)
    intents = {}
    for event in events:
        if event.action.action not in {
            "light.turn_on",
            "light.turn_off",
            "switch.turn_on",
            "switch.turn_off",
        }:
            continue
        at = event.authored_at or event.at
        for entity in event.action.targets:
            intents.setdefault(entity, {}).setdefault(at, set()).add(event.occurrence_id)
    times_by_entity = {entity: sorted(times) for entity, times in intents.items()}
    result = []
    for event in events:
        superseded = event.superseded
        if event.tick:
            entity = event.action.targets[0]
            times = times_by_entity[entity]
            index = bisect_right(times, event.authored_at)
            if index < len(times):
                newer = times[index]
                # The next action at this block's final tick still runs AFTER that
                # tick. External intents at the boundary cancel the older tick.
                superseded |= newer < event.at or (
                    newer == event.at and intents[entity][newer] != {event.occurrence_id}
                )
        result.append(replace(event, superseded=superseded) if superseded else event)
    return tuple(sorted(result, key=lambda event: event.order_key))


def recurring_boundary(timing, context):
    source = timing.relative_to
    return bool(
        timing.absolute_time
        or (
            source
            and (
                source.sun
                or (
                    source.entity
                    and context.time_sources.get(source.entity, {}).get("kind") == "time"
                )
            )
        )
    )


def random_window_issues(
    program, event, simulation_date, context, path, times=None, random_ends=None
):
    """Check unsampled, independent bounds without treating an anchor sample as structural."""
    if not event.max_count:
        return ()
    if duration := event.end.duration:
        minimum, maximum = duration.min, duration.latest_duration
    else:
        day = SimulationDay(program, simulation_date, context, [])
        start = timing_bounds(day, event.start, times or {}, path + ("start",), random_ends)
        end = timing_bounds(day, event.end, times or {}, path + ("end",))
        if start is None or end is None:
            return ()
        start_low, start_high = start
        end_low, end_high = end
        if end_high < start_low and recurring_boundary(event.end, context):
            tomorrow = SimulationDay(program, simulation_date + timedelta(days=1), context, [])
            end = timing_bounds(tomorrow, event.end, times or {}, path + ("end",))
            if end is None:
                return ()
            end_low, end_high = end
        if end_low < start_high and end_high >= start_low:
            return (
                Issue(
                    "random_window_overlap",
                    "Start and end windows must not overlap",
                    path + ("end",),
                ),
            )
        # Preserve recoverable sampling skips for movable timestamp/step sources.
        if not (event.start.absolute_time and event.end.absolute_time):
            return ()
        minimum = (end_low - start_high).total_seconds()
        maximum = (end_high - start_low).total_seconds()
    required = event.min_duration + event.off.stagger_span
    if maximum <= 0:
        return (Issue("random_window", "Window end must be after its start", path + ("end",)),)
    if required > maximum:
        return (
            Issue(
                "random_window",
                "Minimum duration does not fit inside this window",
                path + ("min_duration",),
            ),
        )
    if required > minimum:
        return (
            Issue(
                "random_window_risk",
                "Some window samples are too short and will be skipped",
                path + ("min_duration",),
                "warning",
            ),
        )
    return ()


def generate_plan(
    program: Program, simulation_date: date, seed, *, context=None, source_revision=None
):
    program = validate_program(program)
    from .runtime_planning import MAX_EVENTS

    if max_plan_events(program) > MAX_EVENTS:
        raise ProgramError([Issue("runtime_budget", "Program exceeds the daily event budget")])
    context = context or PlanningContext()
    issues, times, events = list(validation_warnings(program)), {}, []
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
        start = sample_timing(day, step.timing, times, path, streams.rng("step", key, "start"))
        if start is None:
            continue
        earliest = None
        if step.timing.latest_at:
            probe = SimulationDay(program, simulation_date, context, [])
            if bounds := timing_bounds(probe, step.timing, times, path):
                earliest = bounds[0]
        start = apply_step_limits(day, step.timing, start, path, earliest=earliest)
        if start is None:
            continue
        times[key] = start
        events.extend(plan_actions(step, start, f"{simulation_date}:step:{key}", key, streams))
    random_ends = {}
    for key in random_order(program):
        event = program.random[key]
        path = ("random", key)
        if not event.enabled or WEEKDAYS[simulation_date.weekday()] not in event.days:
            issues.append(
                Issue(
                    "random_skipped",
                    f"{key} is disabled or not selected for this date",
                    path,
                    "info",
                )
            )
            continue
        bounds_issues = random_window_issues(
            program, event, simulation_date, context, path, times, random_ends
        )
        issues.extend(bounds_issues)
        if any(issue.severity == "error" for issue in bounds_issues):
            continue
        count = streams.rng("random", key, "count").randint(event.min_count, event.max_count)
        if count == 0:
            issues.append(
                Issue(
                    "random_skipped",
                    f"{key} sampled zero occurrences; item skipped",
                    path + ("count",),
                    "info",
                )
            )
            continue
        start = sample_timing(
            day,
            event.start,
            times,
            path + ("start",),
            streams.rng("random", key, "start"),
            random_ends,
        )
        if start is None:
            continue
        if duration := event.end.duration:
            end = start + timedelta(
                seconds=streams.rng("random", key, "end").uniform(
                    duration.min, duration.latest_duration
                )
            )
        else:
            end = sample_timing(
                day, event.end, times, path + ("end",), streams.rng("random", key, "end")
            )
        if end is None:
            continue
        bounds_day = SimulationDay(program, simulation_date, context, [])
        start_bounds = timing_bounds(bounds_day, event.start, times, path + ("start",), random_ends)
        end_bounds = (
            None
            if event.end.duration
            else timing_bounds(bounds_day, event.end, times, path + ("end",))
        )
        if (
            start_bounds
            and end_bounds
            and end_bounds[1] < start_bounds[0]
            and recurring_boundary(event.end, context)
        ):
            next_day = SimulationDay(program, simulation_date + timedelta(days=1), context, issues)
            end = sample_timing(
                next_day, event.end, times, path + ("end",), streams.rng("random", key, "end")
            )
            if end is None:
                continue
        span = (end - start).total_seconds()
        if span <= 0:
            issues.append(
                Issue(
                    "random_window",
                    "Sampled window end is not after its start; item skipped",
                    path + ("end",),
                    "warning",
                )
            )
            continue
        end_span = event.off.stagger_span
        if event.min_duration + end_span > span:
            issues.append(
                Issue(
                    "random_window",
                    "Minimum duration does not fit inside the sampled window; item skipped",
                    path + ("min_duration",),
                    "warning",
                )
            )
            continue
        random_ends[key] = end
        for occurrence in range(count):
            duration = streams.rng("random", key, occurrence, "duration").uniform(
                event.min_duration, min(event.max_duration, span - end_span)
            )
            at = start + timedelta(
                seconds=streams.rng("random", key, occurrence, "time").uniform(
                    0, span - duration - end_span
                )
            )
            for phase, when, configured in (
                ("start", at, event.on),
                ("end", at + timedelta(seconds=duration), event.off),
            ):
                events.extend(
                    plan_actions(
                        configured,
                        when,
                        f"{simulation_date}:random:{key}:{occurrence}:{phase}",
                        key,
                        streams,
                        sequence=occurrence * 2 + (phase == "end"),
                        kind=f"random_{phase}",
                    )
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
        supersede_ticks(events),
        times,
        tuple(issues),
    )


def apply_step_limits(day, timing, candidate, path, *, earliest=None):
    """Clamp one sample, then filter it, before publishing any anchor or action."""
    resolved = {}
    for key in ("latest_at", "only_before"):
        boundary = getattr(timing, key)
        if boundary is None:
            continue
        boundary_path = path + (key,)
        if boundary.absolute_time:
            instant = day.clock(
                boundary.absolute_time.start, boundary_path + ("absolute_time", "start")
            )
        else:
            bounds = day.sun_bounds(boundary.relative_to, boundary_path + ("relative_to",))
            if bounds is None:
                return None
            instant = bounds[0]
        resolved[key] = instant
    if (
        earliest is not None
        and resolved.get("latest_at", earliest) < earliest
        and not any(
            issue.code == "latest_at_before_start" and issue.path == path + ("latest_at",)
            for issue in day.issues
        )
    ):
        day.issues.append(early_cap_warning(path))
    adjusted = min(candidate, resolved.get("latest_at", candidate))
    details = {"candidate": candidate.isoformat(), "adjusted": adjusted.isoformat()}
    if "only_before" in resolved and adjusted >= resolved["only_before"]:
        boundary = resolved["only_before"]
        source = timing.only_before.relative_to
        label = f"{source.sun} {format_duration(source.start_offset)}; " if source else ""
        day.issues.append(
            Issue(
                "only_before_skipped",
                f"{path[1]} skipped: {adjusted.astimezone(day.zone).isoformat()} "
                f"is not strictly before {boundary.astimezone(day.zone).isoformat()} "
                f"({label}source date {day.date})",
                path + ("only_before",),
                "info",
                details=details | {"boundary": boundary.isoformat()},
            )
        )
        return None
    if adjusted != candidate:
        day.issues.append(
            Issue(
                "latest_at_applied",
                f"{path[1]} runs at {adjusted.astimezone(day.zone).isoformat()} "
                "because of the limit; "
                f"sampled {candidate.astimezone(day.zone).isoformat()} (source date {day.date})",
                path + ("latest_at",),
                "info",
                details=details | {"boundary": resolved["latest_at"].isoformat()},
            )
        )
    return adjusted


def timing_bounds(day, timing, times, path, random_ends=None):
    source = timing.relative_to
    if source and source.step:
        if source.step not in times:
            day.issues.append(
                Issue(
                    "anchor_skipped",
                    f"{source.step} did not occur; item skipped",
                    path + ("relative_to",),
                    "info",
                )
            )
            return None
        bounds = (
            times[source.step] + timedelta(seconds=source.start_offset),
            times[source.step] + timedelta(seconds=source.latest_offset),
        )
    elif source and source.random:
        anchor = (random_ends or {}).get(source.random)
        if anchor is None:
            day.issues.append(
                Issue(
                    "anchor_skipped",
                    f"{source.random} did not occur; item skipped",
                    path + ("relative_to",),
                    "info",
                )
            )
            return None
        bounds = (
            anchor + timedelta(seconds=source.start_offset),
            anchor + timedelta(seconds=source.latest_offset),
        )
    elif source:
        bounds = (
            day.sun_bounds(source, path + ("relative_to",))
            if source.sun
            else day.entity_bounds(source, path + ("relative_to",))
        )
    else:
        bounds = day.clock_bounds(timing.absolute_time, path + ("absolute_time",))
    return bounds


def sample_timing(day, timing, times, path, rng, random_ends=None):
    bounds = timing_bounds(day, timing, times, path, random_ends)
    if bounds is None:
        return None
    low, high = bounds
    return (
        low + timedelta(seconds=rng.uniform(0, (high - low).total_seconds()))
        if low != high
        else low
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
    sources = sorted(
        {
            source
            for day in dates
            for adjacent in (day - timedelta(days=1), day, day + timedelta(days=1))
            for source in runtime_dates(program, adjacent)
        }
    )
    maximum = max_plan_events(program)
    if len(sources) * maximum > MAX_CACHED_EVENTS:
        raise ProgramError([Issue("preview_budget", "Preview exceeds its bounded event budget")])
    plans = {}
    for index in range(0, len(sources), 31):
        plans.update(
            (plan.simulation_date, plan)
            for plan in preview_dates(program, sources[index : index + 31], seed, context=context)
        )
    events = supersede_ticks(event for plan in plans.values() for event in plan.events)
    return tuple(
        replace(
            plans[day],
            issues=tuple(
                issue
                for source, plan in plans.items()
                for issue in plan.issues
                if source == day
                or (
                    issue.details
                    and "adjusted" in issue.details
                    and plans[day].start
                    <= datetime.fromisoformat(issue.details["adjusted"])
                    < plans[day].end
                )
            ),
            events=tuple(
                event for event in events if plans[day].start <= event.at < plans[day].end
            ),
            history_events=tuple(
                event
                for event in events
                if plans[day - timedelta(days=1)].start <= event.at < plans[day].start
            ),
            future_events=tuple(
                event
                for event in events
                if plans[day].end <= event.at < plans[day + timedelta(days=1)].end
            ),
        )
        for day in dates
    )
