"""Bound live planning for overnight and relative steps."""

import math
from datetime import timedelta

from .validation import Issue, ProgramError, step_order

DAY = 86400
MAX_DATE_DISTANCE = 14
MAX_EVENTS = 50000
MAX_CACHED_EVENTS = 200000


def runtime_dates(program, today):
    bounds = {}
    active = set()
    before = after = 1
    count = 0
    for key in step_order(program):
        step = program.steps[key]
        source = step.timing.relative_to
        if source:
            low, high = bounds[source.step] if source.step else (0, DAY)
            low, high = low + source.start_offset, high + source.latest_offset
        else:
            low, high = (
                0,
                2 * DAY
                if step.timing.absolute_time.end
                and step.timing.absolute_time.end < step.timing.absolute_time.start
                else DAY,
            )
        bounds[key] = low, high
        if not step.enabled or (source and source.step and source.step not in active):
            continue
        active.add(key)
        count += len(step.entities)
        before = max(before, math.ceil(max(0, high) / DAY) + 1)
        after = max(after, math.ceil(max(0, -low) / DAY) + 1)
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
                    "Steps exceed the bounded live planning horizon or event budget",
                    ("steps",),
                )
            ]
        )
    return [today + timedelta(days=offset) for offset in range(-before, after + 1)]
