"""Bound live compilation and include dates with cross-boundary work."""

import math
from datetime import timedelta

from .models import merge_defaults
from .validation import Issue, ProgramError, resolve_targets, step_order

DAY = 86400
MAX_DATE_DISTANCE = 31
MAX_EVENTS = 50000
MAX_INTERVALS = 10000
MAX_CACHED_EVENTS = 200000


def runtime_dates(program, today):
    """Conservatively bound possible events before allocating sampled plans."""
    steps = {s.id: s for r in program.routines for s in r.steps}
    bounds = {}

    def when_bounds(when):
        if when.relative_to:
            low, high = bounds[when.relative_to]
            return low + when.offset_range.lower, high + when.offset_range.upper
        if source := when.sun_range or when.entity_range:
            return source.offset_range.lower, DAY + source.offset_range.upper
        return 0, DAY * (2 if when.clock_range.cross_midnight else 1)

    for identifier in step_order(program):
        bounds[identifier] = when_bounds(steps[identifier].when)

    def anchor_bounds(anchor):
        low, high = (
            bounds[anchor.step]
            if anchor.step
            else (anchor.day_offset * DAY, (anchor.day_offset + 1) * DAY)
        )
        return low + anchor.offset, high + anchor.offset

    before = after = 1
    event_count = interval_count = 0

    def include(low, high):
        nonlocal before, after
        # Extra date covers DST/day-boundary placement rather than assuming 24h days.
        before = max(before, math.ceil(max(0, high) / DAY) + 1)
        after = max(after, math.ceil(max(0, -low) / DAY) + 1)

    def action_size(actions, defaults):
        count = 0
        delay = 0
        for action in actions:
            targets = resolve_targets(program, action.targets)
            stagger = action.stagger or defaults.stagger
            split = "." not in action.action or action.action.startswith(("light.", "switch."))
            count += max(1, len(targets)) if split or stagger.upper else 1
            delay += max(0, len(targets) - 1) * stagger.upper
        return count, delay

    for routine in program.routines:
        if routine.probability == 0:
            continue
        defaults = merge_defaults(program, routine)
        for item in (*routine.steps, *routine.activities):
            if item.probability == 0:
                continue
            starts = item.actions if hasattr(item, "actions") else item.on_start
            count, delay = action_size(starts, defaults)
            event_count += count
            if not hasattr(item, "actions"):
                event_count += action_size(item.on_end, defaults)[0]
                interval_count += 1
            if item.allow_cross_boundary:
                low, high = when_bounds(item.when)
                include(low, high + delay)
        for window in routine.activity_windows:
            if window.probability == 0:
                continue
            if window.on_start:
                start_size, _ = action_size(window.on_start, defaults)
                end_size, end_delay = action_size(window.on_end, defaults)
                interval_count += window.cycles.upper
                event_count += window.cycles.upper * (start_size + end_size)
                if window.allow_cross_boundary:
                    low = anchor_bounds(window.between.start)[0]
                    high = anchor_bounds(window.between.end)[1]
                    include(
                        low,
                        high + (DAY if window.between.cross_midnight else 0) + end_delay,
                    )
                continue
            size = len(resolve_targets(program, window.targets))
            mode = window.target_mode or defaults.activity_windows.target_mode
            if mode == "one":
                size = 1
            elif mode in {"subset", "weighted_subset"}:
                size = window.subset_size.upper
            interval_count += window.cycles.upper
            event_count += 2 * window.cycles.upper * size
            if window.allow_cross_boundary:
                low = anchor_bounds(window.between.start)[0]
                high = anchor_bounds(window.between.end)[1]
                include(low, high + (DAY if window.between.cross_midnight else 0))
    issues = []
    if before > MAX_DATE_DISTANCE or after > MAX_DATE_DISTANCE:
        issues.append(Issue("runtime_horizon", "Live cross-boundary work must fit within 31 dates"))
    if event_count > MAX_EVENTS or interval_count > MAX_INTERVALS:
        issues.append(
            Issue("runtime_budget", "Maximum live plan exceeds 50,000 events/10,000 intervals")
        )
    if event_count * (before + after + 1) > MAX_CACHED_EVENTS:
        issues.append(Issue("runtime_budget", "Maximum live plan cache exceeds 200,000 events"))
    if issues:
        raise ProgramError(issues)
    return [today + timedelta(days=offset) for offset in range(-before, after + 1)]
