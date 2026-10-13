"""Bound live planning for overnight and relative steps."""

import math
from datetime import timedelta

from .models import max_plan_events
from .validation import Issue, ProgramError, step_order

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
        bounds[key] = low, high
        if not step.enabled or (source and source.step and source.step not in active):
            continue
        active.add(key)
        before = max(before, math.ceil(max(0, high) / DAY) + 1)
        after = max(after, math.ceil(max(0, -low) / DAY) + 1)
    for event in program.random.values():
        timings = (event.start, event.end)
        if not event.enabled or any(
            timing.relative_to and timing.relative_to.step and timing.relative_to.step not in active
            for timing in timings
        ):
            continue
        low, high = timing_bounds(event.start, bounds)
        end_low, end_high = timing_bounds(event.end, bounds)
        # A recurring end may roll to the next local date for an overnight window.
        if not (event.end.relative_to and event.end.relative_to.step):
            end_high += DAY
        before = max(before, math.ceil(max(0, high, end_high) / DAY) + 1)
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


def timing_bounds(timing, bounds):
    if source := timing.relative_to:
        low, high = bounds[source.step] if source.step else (0, DAY)
        return low + source.start_offset, high + source.latest_offset
    clock = timing.absolute_time
    return 0, 2 * DAY if clock.end and clock.end < clock.start else DAY
