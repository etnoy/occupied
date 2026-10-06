"""Pure seeded daily planning; no timers, HA state reads, or device service calls."""

import hashlib
import json
import math
import random
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any, Literal

from .models import (
    WEEKDAYS,
    Action,
    Activity,
    ActivityWindow,
    CountRange,
    Defaults,
    DurationRange,
    Program,
    Routine,
    Step,
    effective_days,
    merge_defaults,
)
from .time_utils import PlanningContext, SimulationDay
from .validation import (
    Issue,
    ModelPath,
    ProgramError,
    behavior_hash,
    items_with_paths,
    program_data,
    resolve_targets,
    step_order,
    validate_program,
    validation_warnings,
)

PLANNER_VERSION = 1


class RandomStreams:
    """Every independent choice is addressed by stable kind/ID/field, not list order."""

    def __init__(self, seed: str | int):
        self.seed = str(seed)

    def rng(self, *parts: str | int) -> random.Random:
        value = json.dumps([self.seed, *parts], separators=(",", ":"))
        return random.Random(int.from_bytes(hashlib.sha256(value.encode()).digest()))


def sample_range(
    bounds: DurationRange,
    rng: random.Random,
    distribution: str = "uniform",
    *,
    maximum: float | None = None,
) -> float:
    low = bounds.lower
    high = bounds.upper if maximum is None else min(bounds.upper, maximum)
    if high < low:
        raise ValueError("Infeasible duration bounds")
    if high == low:
        return low
    if distribution == "triangular":
        mode = (low + high) / 2 if bounds.mode is None else min(high, max(low, bounds.mode))
        return rng.triangular(low, high, mode)
    return rng.uniform(low, high)


def sample_count(bounds: CountRange, rng: random.Random) -> int:
    return rng.randint(bounds.lower, bounds.upper)


@dataclass(frozen=True)
class ResolvedAction:
    action: str
    targets: tuple[str, ...]
    data: dict[str, Any]
    resources: tuple[str, ...]
    replay_safe: bool = False

    def to_dict(self):
        return {
            "action": self.action,
            "targets": {"entities": list(self.targets)},
            "data": self.data.copy(),
            "resources": list(self.resources),
            "replay_safe": self.replay_safe,
        }


@dataclass(frozen=True)
class PlanEvent:
    id: str
    at: datetime
    source_id: str
    kind: Literal["step", "activity_start", "activity_end", "window_start", "window_end"]
    action: ResolvedAction
    sequence: int = 0
    priority: int = 20
    lease_id: str | None = None

    @property
    def order_key(self):
        ending = self.kind in {"activity_end", "window_end"}
        return self.at, self.priority, 0 if ending else 1, self.source_id, self.sequence, self.id

    def to_dict(self, zone=None):
        return {
            "id": self.id,
            "time": self.at.isoformat(),
            "local_time": self.at.astimezone(zone).isoformat() if zone else self.at.isoformat(),
            "source_id": self.source_id,
            "kind": self.kind,
            "priority": self.priority,
            "sequence": self.sequence,
            "lease_id": self.lease_id,
            "action": self.action.to_dict(),
        }


@dataclass(frozen=True)
class PlannedInterval:
    id: str
    source_id: str
    kind: Literal["activity", "window"]
    start: datetime
    end: datetime
    resources: tuple[str, ...]
    groups: tuple[str, ...] = ()
    duration: float | None = None
    start_complete: datetime | None = None
    stop_behavior: str | None = None
    cleanup_complete: datetime | None = None

    def to_dict(self):
        return {
            "id": self.id,
            "source_id": self.source_id,
            "kind": self.kind,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "resources": list(self.resources),
            "groups": list(self.groups),
            "duration_seconds": self.duration,
            "start_complete": self.start_complete.isoformat() if self.start_complete else None,
            "stop_behavior": self.stop_behavior,
            "cleanup_complete": (
                self.cleanup_complete.isoformat() if self.cleanup_complete else None
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
    intervals: tuple[PlannedInterval, ...]
    step_times: dict[str, datetime]
    issues: tuple[Issue, ...] = ()
    planner_version: int = PLANNER_VERSION

    @property
    def feasible(self) -> bool:
        return not any(issue.severity == "error" for issue in self.issues)

    def to_dict(self):
        from zoneinfo import ZoneInfo

        zone = ZoneInfo(self.timezone)
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
            "steps": {key: value.isoformat() for key, value in sorted(self.step_times.items())},
            "events": [event.to_dict(zone) for event in self.events],
            "intervals": [interval.to_dict() for interval in self.intervals],
            "issues": [issue.to_dict() for issue in self.issues],
        }


def _overlap(start: datetime, end: datetime, interval: PlannedInterval) -> bool:
    return start < (interval.cleanup_complete or interval.end) and interval.start < end


class _Planner:
    def __init__(
        self,
        program: Program,
        simulation_date: date,
        seed: str | int,
        context: PlanningContext,
        source_revision: str | None,
    ):
        self.program = program
        self.streams = RandomStreams(seed)
        self.issues = list(validation_warnings(program))
        self.day = SimulationDay(program, simulation_date, context, self.issues)
        self.steps: dict[str, datetime] = {}
        self.events: list[PlanEvent] = []
        self.intervals: list[PlannedInterval] = []
        self.source_revision = (
            source_revision
            or hashlib.sha256(
                json.dumps(program_data(program), sort_keys=True).encode()
            ).hexdigest()
        )
        self.routine_occurs = {
            routine.id: WEEKDAYS[simulation_date.weekday()] in routine.days
            and self.streams.rng("routine", routine.id, "occurrence").random() < routine.probability
            for routine in program.routines
        }

    def occurs(self, routine: Routine, item, defaults: Defaults, path: ModelPath) -> bool:
        if not self.routine_occurs[routine.id] or WEEKDAYS[
            self.day.date.weekday()
        ] not in effective_days(routine, item):
            self.issues.append(
                Issue(
                    "day_or_routine_skipped",
                    f"{item.id} is not selected for this simulation day/routine occurrence",
                    path,
                    "info",
                )
            )
            return False
        probability = item.probability if item.probability is not None else defaults.probability
        kind = (
            "step"
            if isinstance(item, Step)
            else "activity"
            if isinstance(item, Activity)
            else "window"
        )
        if self.streams.rng(kind, item.id, "occurrence").random() >= probability:
            self.issues.append(
                Issue(
                    "probability_skipped",
                    f"{item.id} did not occur at probability {probability:g}",
                    path,
                    "info",
                )
            )
            return False
        return True

    def when(
        self, item: Step | Activity, defaults: Defaults, path: ModelPath, attempt: int = 0
    ) -> datetime | None:
        spec = item.when
        distribution = spec.distribution or item.time_distribution or defaults.time_distribution
        kind = "step" if isinstance(item, Step) else "activity"
        rng = self.streams.rng(kind, item.id, "start", attempt)
        if spec.relative_to is not None:
            if (anchor := self.steps.get(spec.relative_to)) is None:
                self.issues.append(
                    Issue(
                        "anchor_skipped",
                        f"Step anchor {spec.relative_to} did not occur; {item.id} skipped",
                        path + ("when",),
                        "info",
                    )
                )
                return None
            return anchor + timedelta(seconds=sample_range(spec.offset_range, rng, distribution))
        if spec.clock_range is not None:
            bounds = self.day.clock_bounds(spec.clock_range, path + ("when", "clock_range"))
        else:
            bounds = self.day.sun_bounds(spec.sun_range, path + ("when", "sun_range"))
        if bounds is None:
            return None
        start, end, mode = bounds
        if start == end:
            return start
        low, high = start.timestamp(), end.timestamp()
        timestamp = (
            rng.triangular(low, high, mode.timestamp() if mode else (low + high) / 2)
            if distribution == "triangular"
            else rng.uniform(low, high)
        )
        return datetime.fromtimestamp(timestamp, UTC)

    def action_events(
        self,
        item_id: str,
        kind: str,
        at: datetime,
        actions: tuple[Action, ...],
        defaults: Defaults,
        path: ModelPath,
    ) -> list[PlanEvent]:
        result = []
        cursor = at
        sequence = 0
        for action_index, action in enumerate(actions):
            targets = list(resolve_targets(self.program, action.targets))
            order = action.target_order or defaults.target_order
            if order == "shuffled":
                self.streams.rng(kind, item_id, "target_order", action_index).shuffle(targets)
            stagger = action.stagger or defaults.stagger
            qualified = "." in action.action
            # Generic zero-stagger calls retain their native target list; typed
            # controls split light/switch domains and record per-entity events.
            split = (
                not qualified
                or stagger.upper > 0
                or action.action.startswith(("light.", "switch."))
            )
            batches = [(target,) for target in targets] if split else [tuple(targets)]
            if not batches:
                batches = [()]
            for target_index, batch in enumerate(batches):
                if target_index:
                    cursor += timedelta(
                        seconds=sample_range(
                            stagger,
                            self.streams.rng(kind, item_id, "stagger", action_index, target_index),
                            defaults.time_distribution,
                        )
                    )
                resolved_name = action.action
                if not qualified:
                    domain = batch[0].split(".")[0]
                    resolved_name = (
                        f"{domain}.{'turn_off' if action.action == 'safety_off' else action.action}"
                    )
                payload = dict(action.data)
                if resolved_name.startswith("switch."):
                    payload.pop("transition", None)
                sequence += 1
                resources = tuple(sorted(set(action.resources) | set(batch)))
                resolved = ResolvedAction(
                    resolved_name,
                    batch,
                    payload,
                    resources,
                    action.replay_safe
                    or action.action
                    in {
                        "turn_on",
                        "turn_off",
                        "safety_off",
                        "light.turn_on",
                        "light.turn_off",
                        "switch.turn_on",
                        "switch.turn_off",
                    },
                )
                event_id = f"{self.day.date}:{kind}:{item_id}:{action_index}:{target_index}"
                result.append(
                    PlanEvent(
                        event_id,
                        cursor,
                        item_id,
                        kind,
                        resolved,
                        sequence,
                        30 if action.action == "safety_off" else 20,
                    )
                )
        return result

    def plan_steps(self):
        lookup = {
            item.id: (routine, item, path)
            for routine, item, path in items_with_paths(self.program)
            if isinstance(item, Step)
        }
        for step_id in step_order(self.program):
            routine, item, path = lookup[step_id]
            defaults = merge_defaults(self.program, routine)
            if not self.occurs(routine, item, defaults, path):
                continue
            try:
                instant = self.when(item, defaults, path)
                if instant is None:
                    continue
                events = self.action_events(item.id, "step", instant, item.actions, defaults, path)
                if not item.allow_cross_boundary and (
                    not self.day.contains(instant)
                    or any(not self.day.contains(event.at) for event in events)
                ):
                    self.issues.append(
                        Issue(
                            "outside_day",
                            f"Step {item.id} extends outside the simulation day; "
                            "use an explicit allow_cross_boundary policy",
                            path,
                        )
                    )
                    continue
                self.steps[item.id] = instant
                self.events.extend(events)
            except ProgramError as err:
                self.issues.extend(err.issues)

    def plan_activities(self):
        activities = sorted(
            (entry for entry in items_with_paths(self.program) if isinstance(entry[1], Activity)),
            key=lambda entry: entry[1].id,
        )
        for routine, item, path in activities:
            defaults = merge_defaults(self.program, routine)
            if not self.occurs(routine, item, defaults, path):
                continue
            distribution = item.time_distribution or defaults.time_distribution
            duration = sample_range(
                item.duration or defaults.activities.duration,
                self.streams.rng("activity", item.id, "duration"),
                distribution,
            )
            placed = False
            try:
                window = (
                    self.day.between(item.within, self.steps, path + ("within",))
                    if item.within
                    else None
                )
                if item.within and window is None:
                    continue
                for attempt in range(self.program.constraints.generation_attempts):
                    start = self.when(item, defaults, path, attempt)
                    if start is None:
                        placed = True  # The anchor/sun skip is already explained.
                        break
                    starts = self.action_events(
                        item.id, "activity_start", start, item.on_start, defaults, path
                    )
                    completed = max(event.at for event in starts)
                    end = completed + timedelta(seconds=duration)
                    ends = self.action_events(
                        item.id, "activity_end", end, item.on_end, defaults, path
                    )
                    last_end = max(event.at for event in ends)
                    if not item.allow_cross_boundary and not self.day.contains(start, last_end):
                        continue
                    if window and not (window[0] <= start and last_end <= window[1]):
                        continue
                    if any(
                        set(item.resources) & set(interval.resources)
                        and _overlap(start, last_end, interval)
                        for interval in self.intervals
                        if interval.kind == "activity"
                    ):
                        continue
                    interval = PlannedInterval(
                        f"activity:{item.id}",
                        item.id,
                        "activity",
                        start,
                        end,
                        tuple(sorted(set(item.resources))),
                        duration=duration,
                        start_complete=completed,
                        stop_behavior=item.stop_behavior or defaults.activities.stop_behavior,
                        cleanup_complete=last_end,
                    )
                    self.intervals.append(interval)
                    self.events.extend(starts + ends)
                    placed = True
                    break
            except ProgramError as err:
                self.issues.extend(err.issues)
                placed = True
            if not placed:
                self.issues.append(
                    Issue(
                        "activity_infeasible",
                        f"Activity {item.id} cannot fit its duration/deadline/exclusive "
                        f"resources after {self.program.constraints.generation_attempts} "
                        "bounded attempts",
                        path,
                    )
                )

    def select_targets(
        self, item: ActivityWindow, defaults: Defaults, index: int
    ) -> tuple[str, ...]:
        targets = resolve_targets(self.program, item.targets)
        mode = item.target_mode or defaults.activity_windows.target_mode
        if mode == "all":
            return targets
        count = (
            1
            if mode == "one"
            else sample_count(
                item.subset_size, self.streams.rng("window", item.id, "subset_count", index)
            )
        )
        # Weighted sampling without replacement, in stable entity order.
        ranked = []
        for entity in targets:
            weight = item.weights.get(entity, 1) if mode in {"one", "weighted_subset"} else 1
            draw = self.streams.rng("window", item.id, "target", index, entity).random()
            ranked.append((-math.log(max(draw, 1e-300)) / weight, entity))
        return tuple(sorted(entity for _, entity in sorted(ranked)[:count]))

    def window_candidates(
        self,
        item: ActivityWindow,
        defaults: Defaults,
        start: datetime,
        end: datetime,
        count: int,
        attempt: int,
    ) -> list[PlannedInterval]:
        bounds = item.on_duration or defaults.activity_windows.on_duration
        overlap = item.overlap if item.overlap is not None else defaults.activity_windows.overlap
        gap = item.min_gap if item.min_gap is not None else defaults.activity_windows.min_gap
        distribution = item.time_distribution or defaults.time_distribution
        span = (end - start).total_seconds()
        if bounds.lower > span or (
            not overlap and count * bounds.lower + max(0, count - 1) * gap > span
        ):
            raise ProgramError(
                [
                    Issue(
                        "window_infeasible",
                        f"Window {item.id}: {count} cycles cannot fit minimum "
                        f"durations/gaps in {span:g}s",
                    )
                ]
            )
        durations = []
        remaining = span - max(0, count - 1) * gap
        for index in range(count):
            maximum = span if overlap else remaining - (count - index - 1) * bounds.lower
            duration = sample_range(
                bounds,
                self.streams.rng("window", item.id, "duration", index),
                distribution,
                maximum=maximum,
            )
            durations.append(duration)
            remaining -= duration
        intervals = []
        if overlap:
            offsets = [
                self.streams.rng("window", item.id, "placement", attempt, index).uniform(
                    0, max(0, span - duration)
                )
                for index, duration in enumerate(durations)
            ]
        else:
            slack = max(0, span - sum(durations) - max(0, count - 1) * gap)
            weights = [
                -math.log(
                    max(self.streams.rng("window", item.id, "gap", attempt, index).random(), 1e-300)
                )
                for index in range(count + 1)
            ]
            total = sum(weights)
            extra_gaps = [slack * weight / total for weight in weights]
            offsets = []
            cursor = extra_gaps[0]
            for index, duration in enumerate(durations):
                offsets.append(cursor)
                cursor += duration + (gap if index < count - 1 else 0) + extra_gaps[index + 1]
        for index, (offset, duration) in enumerate(zip(offsets, durations, strict=True)):
            interval_start = start + timedelta(seconds=offset)
            interval_end = min(end, interval_start + timedelta(seconds=duration))
            targets = self.select_targets(item, defaults, index)
            selected = set(targets)
            groups = tuple(
                sorted(
                    group.id
                    for group in self.program.groups
                    if group.id in item.targets.groups and selected.intersection(group.entities)
                )
            ) or (f"window:{item.id}",)
            intervals.append(
                PlannedInterval(
                    f"window:{item.id}:{index}",
                    item.id,
                    "window",
                    interval_start,
                    interval_end,
                    targets,
                    groups,
                    (interval_end - interval_start).total_seconds(),
                )
            )
        return intervals

    def concurrency_passes(self, candidate: list[PlannedInterval], item: ActivityWindow) -> bool:
        windows = [interval for interval in self.intervals if interval.kind == "window"] + candidate
        points = sorted(
            {instant for interval in windows for instant in (interval.start, interval.end)}
        )
        for point in points:
            active = [interval for interval in windows if interval.start <= point < interval.end]
            if (
                item.max_simultaneous is not None
                and sum(interval.source_id == item.id for interval in active)
                > item.max_simultaneous
            ):
                return False
            groups = {group for interval in active for group in interval.groups}
            limit = self.program.constraints.max_simultaneous_groups
            if limit is not None and len(groups) > limit:
                return False
        return True

    def plan_windows(self):
        windows = sorted(
            (
                entry
                for entry in items_with_paths(self.program)
                if isinstance(entry[1], ActivityWindow)
            ),
            key=lambda entry: entry[1].id,
        )
        for routine, item, path in windows:
            defaults = merge_defaults(self.program, routine)
            if not self.occurs(routine, item, defaults, path):
                continue
            try:
                span = self.day.between(item.between, self.steps, path + ("between",))
                if span is None:
                    continue
                start, end = span
                if not item.allow_cross_boundary and not self.day.contains(start, end):
                    self.issues.append(
                        Issue(
                            "outside_day",
                            f"Window {item.id} extends outside the simulation day",
                            path,
                        )
                    )
                    continue
                count = sample_count(item.cycles, self.streams.rng("window", item.id, "count"))
                if count == 0:
                    self.issues.append(
                        Issue("zero_cycles", f"Window {item.id} sampled zero cycles", path, "info")
                    )
                    continue
                chosen = None
                for attempt in range(self.program.constraints.generation_attempts):
                    candidates = self.window_candidates(item, defaults, start, end, count, attempt)
                    if self.concurrency_passes(candidates, item):
                        chosen = candidates
                        if attempt:
                            self.issues.append(
                                Issue(
                                    "constraint_placement",
                                    f"Window {item.id} placed after {attempt + 1} "
                                    "bounded attempts to honor concurrency",
                                    path,
                                    "info",
                                )
                            )
                        break
                if chosen is None:
                    self.issues.append(
                        Issue(
                            "concurrency_infeasible",
                            f"Window {item.id} cannot honor concurrency after "
                            f"{self.program.constraints.generation_attempts} attempts; "
                            "selected count is not silently reduced",
                            path,
                        )
                    )
                    continue
                self.intervals.extend(chosen)
                for interval in chosen:
                    for index, entity in enumerate(interval.resources):
                        domain = entity.split(".")[0]
                        for kind, at, service, payload in (
                            ("window_start", interval.start, "turn_on", dict(item.data)),
                            ("window_end", interval.end, "turn_off", {}),
                        ):
                            action = ResolvedAction(
                                f"{domain}.{service}", (entity,), payload, (entity,), True
                            )
                            event_id = f"{self.day.date}:{interval.id}:{kind}:{entity}"
                            self.events.append(
                                PlanEvent(
                                    event_id, at, item.id, kind, action, index, 10, interval.id
                                )
                            )
            except ProgramError as err:
                self.issues.extend(
                    Issue(issue.code, issue.message, issue.path or path, issue.severity)
                    for issue in err.issues
                )

    def build(self) -> DailyPlan:
        self.plan_steps()
        self.plan_activities()
        self.plan_windows()
        identity = {
            "program": behavior_hash(self.program),
            "timezone": self.day.zone.key,
            "latitude": self.day.observer.latitude if self.day.observer else None,
            "longitude": self.day.observer.longitude if self.day.observer else None,
            "elevation": self.day.observer.elevation if self.day.observer else None,
        }
        behavior = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
        return DailyPlan(
            self.day.date,
            self.streams.seed,
            behavior,
            self.source_revision,
            self.day.zone.key,
            self.day.start,
            self.day.end,
            tuple(sorted(self.events, key=lambda event: event.order_key)),
            tuple(sorted(self.intervals, key=lambda interval: (interval.start, interval.id))),
            dict(self.steps),
            tuple(self.issues),
        )


def generate_plan(
    program: Program,
    simulation_date: date,
    seed: str | int,
    *,
    context: PlanningContext | None = None,
    source_revision: str | None = None,
) -> DailyPlan:
    return _Planner(
        validate_program(program),
        simulation_date,
        seed,
        context or PlanningContext(),
        source_revision,
    ).build()


def preview_dates(
    program: Program,
    dates: Iterable[date],
    seed: str | int,
    *,
    context: PlanningContext | None = None,
) -> tuple[DailyPlan, ...]:
    """Date streams are independent; previewing a week or one day yields identical choices."""
    dates = tuple(dates)
    if not 1 <= len(dates) <= 31:
        raise ProgramError([Issue("preview_dates", "Preview between one and 31 simulation dates")])
    result = []
    for day in dates:
        day_seed = hashlib.sha256(json.dumps([str(seed), day.isoformat()]).encode()).hexdigest()
        result.append(generate_plan(program, day, day_seed, context=context))
    return tuple(result)
