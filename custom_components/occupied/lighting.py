"""Project only known typed light intents; no invented initial state."""

from dataclasses import asdict, dataclass
from datetime import UTC, timedelta
from typing import Literal

from .models import Handover, projectable_lights
from .validation import Issue, ProgramError


@dataclass(frozen=True)
class LightState:
    state: Literal["on", "off"]
    brightness_pct: float | None = None
    color_temp_kelvin: int | None = None
    hs_color: tuple[float, float] | None = None
    rgb_color: tuple[int, int, int] | None = None

    def to_dict(self):
        return {key: value for key, value in asdict(self).items() if value is not None}


def project_lighting(program, plan, instant, *, yielded=frozenset()):
    if instant.tzinfo is None:
        raise ProgramError([Issue("naive_projection", "Use a timezone-aware instant")])
    instant = instant.astimezone(UTC)
    if not plan.start <= instant <= plan.end:
        raise ProgramError(
            [Issue("projection_day", "Supply the plan covering the projection instant")]
        )
    lights, states = projectable_lights(program) - yielded, {}
    for event in plan.events:
        if event.at > instant:
            break
        action = event.action
        if action.action not in {"light.turn_on", "light.turn_off"}:
            # Opaque calls can invalidate an earlier known intent on their explicit targets.
            for entity in action.targets:
                states.pop(entity, None)
            continue
        for entity in lights.intersection(action.targets):
            if action.action == "light.turn_off":
                states[entity] = LightState("off", 0)
                continue
            data = action.data
            previous = states.get(entity)
            brightness = data.get("brightness_pct")
            if brightness is None and "brightness" in data:
                brightness = data["brightness"] * 100 / 255
            if brightness is None and previous and previous.state == "on":
                brightness = previous.brightness_pct
            colors = any(k in data for k in ("color_temp_kelvin", "hs_color", "rgb_color"))
            states[entity] = LightState(
                "on",
                brightness,
                data.get("color_temp_kelvin")
                if colors
                else previous.color_temp_kelvin
                if previous
                else None,
                tuple(data["hs_color"])
                if "hs_color" in data
                else None
                if colors
                else previous.hs_color
                if previous
                else None,
                tuple(data["rgb_color"])
                if "rgb_color" in data
                else None
                if colors
                else previous.rgb_color
                if previous
                else None,
            )
    return states


def preview_handover(program, plan, start, *, observed=None, yielded=frozenset()):
    if start.tzinfo is None:
        raise ProgramError([Issue("naive_projection", "Use a timezone-aware instant")])
    start = start.astimezone(UTC)
    completion = start + timedelta(seconds=Handover().duration)
    targets, issues = {}, []
    for entity in project_lighting(program, plan, start, yielded=yielded):
        if completion > plan.end:
            issues.append(
                Issue(
                    "next_day_plan_required",
                    f"{entity} needs the next date's plan",
                    severity="warning",
                ).to_dict()
            )
            continue
        target = project_lighting(program, plan, completion, yielded=yielded).get(entity)
        if target is None:
            continue
        current = (observed or {}).get(entity)
        targets[entity] = {
            "deadline": completion.isoformat(),
            "duration_seconds": Handover().duration,
            "observed": current.to_dict() if current else None,
            "target": target.to_dict(),
            "needs_change": current != target if current else None,
        }
    return {
        "start": start.isoformat(),
        "completion": completion.isoformat(),
        "targets": targets,
        "issues": issues,
    }
