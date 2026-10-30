"""Bound live planning for overnight and relative steps."""

import math
from datetime import timedelta

from .models import max_plan_events
from .validation import Issue, ProgramError, random_order, step_order

DAY = 86400
MAX_DATE_DISTANCE = 14
MAX_EVENTS = 50000
MAX_CACHED_EVENTS = 200000


def runtime_dates(program, today):
    bounds = {}
    active = set()
    before = after = 1
    for key in step_order(program):
        step = program.steps[key]
        source = step.timing.relative_to
        low, high = timing_bounds(step.timing, bounds)
        if cap := step.timing.latest_at:
            if cap.relative_to:
                cap_low = cap.relative_to.start_offset
                cap_high = DAY + cap_low
            else:
                cap_low, cap_high = 0, DAY
            low, high = min(low, cap_low), min(high, cap_high)
        bounds[key] = low, high
        if not step.enabled or (source and source.step and source.step not in active):
            continue
        active.add(key)
        before = max(before, math.ceil(max(0, high + step.stagger_span) / DAY) + 1)
        after = max(after, math.ceil(max(0, -low) / DAY) + 1)
    random_bounds = {}
    active_random = set()
    for key in random_order(program):
        event = program.random[key]
        timings = (event.start, event.end)
        if (
            not event.enabled
            or event.max_count == 0
            or any(
                timing.relative_to
                and timing.relative_to.step
                and timing.relative_to.step not in active
                for timing in timings
            )
        ):
            continue
        source = event.start.relative_to
        if source and source.random and source.random not in active_random:
            continue
        low, high = timing_bounds(event.start, bounds, random_bounds)
        if duration := event.end.duration:
            end_low = low + duration.min
            end_high = high + duration.latest_duration
        else:
            end_low, end_high = timing_bounds(event.end, bounds)
        # A recurring end may roll to the next local date for an overnight window.
        if not event.end.duration and not (event.end.relative_to and event.end.relative_to.step):
            end_high += DAY
        random_bounds[key] = end_low, end_high
        active_random.add(key)
        before = max(
            before,
            math.ceil(max(0, high + event.on.stagger_span, end_high + event.off.stagger_span) / DAY)
            + 1,
        )
        after = max(after, math.ceil(max(0, -low, -end_low) / DAY) + 1)
    count = max_plan_events(program)
    if (
        before > MAX_DATE_DISTANCE
        or after > MAX_DATE_DISTANCE
        or count > MAX_EVENTS
        or count * (before + after + 1) > MAX_CACHED_EVENTS
    ):
        raise ProgramError(
            [
                Issue(
                    "runtime_budget",
                    "Program exceeds the bounded live planning horizon or event budget",
                )
            ]
        )
    return [today + timedelta(days=offset) for offset in range(-before, after + 1)]


def timing_bounds(timing, bounds, random_bounds=None):
    if spec := getattr(timing, "lux", None):
        endpoints = (spec.window.start, spec.window.end)
        offsets = [edge.relative_to.start_offset if edge.relative_to else 0 for edge in endpoints]
        return min(0, *offsets), 2 * DAY + max(0, *offsets)
    if source := timing.relative_to:
        low, high = (
            bounds[source.step]
            if source.step
            else (random_bounds or {})[source.random]
            if source.random
            else (0, DAY)
        )
        return low + source.start_offset, high + source.latest_offset
    clock = timing.absolute_time
    return 0, 2 * DAY if clock.end and clock.end < clock.start else DAY
