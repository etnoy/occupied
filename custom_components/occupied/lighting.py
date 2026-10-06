"""Pure declarative lighting projection and handover endpoints from a sampled plan."""

from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from .models import Program, effective_handover
from .planner import DailyPlan
from .validation import Issue, ProgramError, resolve_targets


@dataclass(frozen=True)
class LightState:
    state: Literal["on", "off"]
    brightness_pct: float | None = None
    color_temp_kelvin: int | None = None
    hs_color: tuple[float, float] | None = None
    rgb_color: tuple[int, int, int] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {key: value for key, value in asdict(self).items() if value is not None}


def _on(previous: LightState, data: dict[str, Any], default_brightness: float) -> LightState:
    brightness = data.get("brightness_pct")
    if brightness is None and "brightness" in data:
        brightness = data["brightness"] * 100 / 255
    if brightness is None:
        brightness = previous.brightness_pct if previous.state == "on" else default_brightness
    new_colors = any(key in data for key in ("color_temp_kelvin", "hs_color", "rgb_color"))
    return LightState(
        "on",
        brightness,
        data.get("color_temp_kelvin") if new_colors else previous.color_temp_kelvin,
        tuple(data["hs_color"])
        if "hs_color" in data
        else None
        if new_colors
        else previous.hs_color,
        tuple(data["rgb_color"])
        if "rgb_color" in data
        else None
        if new_colors
        else previous.rgb_color,
    )


def project_lighting(
    program: Program, plan: DailyPlan, instant: datetime, *, yielded: frozenset[str] = frozenset()
) -> dict[str, LightState]:
    """Fold baselines/intents/leases, without replaying past services or opaque actions."""
    if instant.tzinfo is None:
        raise ProgramError(
            [Issue("naive_projection", "Projection requires a timezone-aware instant")]
        )
    instant = instant.astimezone(UTC)
    if not plan.start <= instant <= plan.end:
        raise ProgramError(
            [Issue("projection_day", "Supply the sampled plan covering the projection instant")]
        )
    managed = set(resolve_targets(program, program.lighting.managed_targets)) - yielded
    baseline = {}
    for item in program.lighting.baseline:
        data = item.model_dump(exclude={"targets", "state"}, exclude_none=True)
        state = (
            _on(LightState("off"), data, program.lighting.default_brightness_pct)
            if item.state == "on"
            else LightState("off", 0)
        )
        for entity in resolve_targets(program, item.targets):
            if entity in managed:
                baseline[entity] = state
    explicit: dict[str, LightState] = {}
    safety: set[str] = set()
    leases: dict[str, dict[str, LightState]] = {entity: {} for entity in baseline}

    def desired(entity):
        if entity in safety:
            return LightState("off", 0)
        if entity in explicit:
            return explicit[entity]
        if leases[entity]:
            return next(reversed(leases[entity].values()))
        return baseline[entity]

    for event in plan.events:
        if event.at > instant:
            break
        if event.action.action not in {"light.turn_on", "light.turn_off"}:
            continue
        for entity in event.action.targets:
            if entity not in baseline:
                continue
            if event.kind == "window_end":
                leases[entity].pop(event.lease_id, None)
            elif event.kind == "window_start":
                leases[entity][event.lease_id] = _on(
                    desired(entity), event.action.data, program.lighting.default_brightness_pct
                )
            elif event.priority == 30:
                safety.add(entity)
            elif entity not in safety:
                explicit[entity] = (
                    _on(desired(entity), event.action.data, program.lighting.default_brightness_pct)
                    if event.action.action == "light.turn_on"
                    else LightState("off", 0)
                )
    return {entity: desired(entity) for entity in sorted(baseline)}


def preview_handover(
    program: Program,
    plan: DailyPlan,
    start: datetime,
    *,
    observed: dict[str, LightState] | None = None,
    yielded: frozenset[str] = frozenset(),
) -> dict[str, Any]:
    """Project each participating target at its own completion deadline."""
    if start.tzinfo is None:
        raise ProgramError(
            [Issue("naive_projection", "Handover requires a timezone-aware instant")]
        )
    start = start.astimezone(UTC)
    participating = project_lighting(program, plan, start, yielded=yielded)
    groups = {group.id: group for group in program.groups}
    durations = {entity: effective_handover(program).duration for entity in participating}
    for entity in durations:
        memberships = [
            effective_handover(program, groups[group_id]).duration
            for group_id in program.lighting.managed_targets.groups
            if entity in groups[group_id].entities
        ]
        if entity in program.lighting.managed_targets.entities:
            memberships.append(effective_handover(program).duration)
        if memberships:
            durations[entity] = max(memberships)
    targets = {}
    issues = []
    completion = start
    for entity, duration in sorted(durations.items()):
        deadline = start + timedelta(seconds=duration)
        completion = max(completion, deadline)
        if deadline > plan.end:
            issues.append(
                Issue(
                    "next_day_plan_required",
                    f"{entity}'s handover crosses the day boundary; "
                    "its next-day sampled plan is required",
                    severity="warning",
                ).to_dict()
            )
            continue
        target = project_lighting(program, plan, deadline, yielded=yielded)[entity]
        current = observed.get(entity) if observed else None
        targets[entity] = {
            "deadline": deadline.isoformat(),
            "duration_seconds": duration,
            "observed": current.to_dict() if current else None,
            "target": target.to_dict(),
            "needs_change": current != target if current is not None else None,
        }
    subsumed = [
        interval.id
        for interval in plan.intervals
        if interval.kind == "window"
        and start <= interval.start
        and interval.end <= completion
        and any(entity in participating for entity in interval.resources)
    ]
    return {
        "start": start.isoformat(),
        "completion": completion.isoformat(),
        "targets": targets,
        "subsumed_intervals": subsumed,
        "issues": issues,
    }
