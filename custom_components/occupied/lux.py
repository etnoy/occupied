"""Pure illuminance qualification and source-date observation windows."""

import math
from dataclasses import dataclass, replace
from datetime import datetime, timedelta

from .models import WEEKDAYS
from .time_utils import SimulationDay
from .validation import Issue


def sensor_lux(value, attributes):
    if (
        attributes.get("device_class") != "illuminance"
        or attributes.get("unit_of_measurement") != "lx"
    ):
        return None
    try:
        number = float(value)
        return number if math.isfinite(number) and number >= 0 else None
    except (TypeError, ValueError):
        return None


@dataclass
class Qualification:
    since: datetime | None = None
    due: datetime | None = None
    phase: str = "waiting_for_light"


def evaluate(spec, state, now, end, reading, delay):
    """Return a terminal reason, or advance continuous observation in-place."""
    if now >= end:
        return "fallback" if spec.fallback == "run" else "skipped"
    matches = reading is not None and (
        reading > spec.above if spec.above is not None else reading < spec.below
    )
    if not matches:
        state.since = state.due = None
        state.phase = "waiting_for_sensor" if reading is None else "waiting_for_light"
        return None
    if state.since is None:
        state.since = now
    qualified = state.since + timedelta(seconds=spec.stable_for)
    action_at = qualified + timedelta(seconds=delay)
    state.due = qualified if now < qualified else action_at
    state.phase = "qualifying" if now < qualified else "random_delay"
    return "lux" if now >= action_at else None


def boundary_at(day, boundary, path):
    if boundary.absolute_time:
        return day.clock(boundary.absolute_time.start, path)
    bounds = day.sun_bounds(boundary.relative_to, path)
    return bounds[0] if bounds else None


def lux_windows(program, source_date, context, issues=None):
    issues = issues if issues is not None else []
    day = SimulationDay(program, source_date, context, issues)
    result = {}
    for key, step in program.steps.items():
        spec = step.timing.lux
        if not spec or not step.enabled or WEEKDAYS[source_date.weekday()] not in step.days:
            continue
        path = ("steps", key, "timing", "lux", "window")
        end_day = SimulationDay(
            program, source_date + timedelta(days=spec.window.end_day_offset), context, issues
        )
        start = boundary_at(day, spec.window.start, path + ("start",))
        end = boundary_at(end_day, spec.window.end, path + ("end",))
        next_day = SimulationDay(program, source_date + timedelta(days=1), context, [])
        next_start = boundary_at(next_day, spec.window.start, path + ("start",))
        if start is None or end is None:
            continue
        if not 0 < (end - start).total_seconds() <= 86400 or (
            next_start is not None and end > next_start
        ):
            issues.append(
                Issue(
                    "lux_window",
                    "Light-level window must be positive, at most 24 hours "
                    "and not overlap the next occurrence",
                    path,
                )
            )
            continue
        result[key] = start, end
    return result


def simulated_context(program, source_date, context, seed, mode):
    """Freeze explicit manual-preview outcomes without observing real devices."""
    from .planner import RandomStreams
    from .runtime_planning import runtime_dates

    resolutions = {day: dict(values) for day, values in context.lux_resolutions.items()}
    for day in runtime_dates(program, source_date):
        for key, (start, end) in lux_windows(program, day, context).items():
            spec = program.steps[key].timing.lux
            delay = (
                RandomStreams(seed)
                .rng("lux_delay", f"{day}:{key}")
                .uniform(
                    spec.delay.min, spec.delay.max if spec.delay.max is not None else spec.delay.min
                )
            )
            candidate = start + timedelta(seconds=spec.stable_for + delay)
            at = (
                candidate
                if mode == "threshold" and candidate < end
                else end
                if spec.fallback == "run"
                else None
            )
            resolutions.setdefault(str(day), {})[key] = at.isoformat() if at else None
    return replace(context, lux_resolutions=resolutions)
