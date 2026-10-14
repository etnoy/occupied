"""Strict step validation, typed references, and stable behavior identity."""

import hashlib
import heapq
import json
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from typing import Any, Literal

from pydantic import ValidationError

from .models import Program, program_actions, program_timings

type ModelPath = tuple[str | int, ...]


@dataclass(frozen=True)
class Issue:
    code: str
    message: str
    path: ModelPath = ()
    severity: Literal["error", "warning", "info"] = "error"
    line: int | None = None
    column: int | None = None

    def to_dict(self):
        return asdict(self) | {"path": format_path(self.path), "model_path": list(self.path)}


class ProgramError(ValueError):
    def __init__(self, issues):
        self.issues = tuple(issues)
        super().__init__("; ".join(f"{format_path(i.path)}: {i.message}" for i in issues))


class RevisionConflict(ValueError):
    """The editor's revision no longer matches the live program."""


def format_path(path):
    return "$" + "".join(f"[{p}]" if isinstance(p, int) else f".{p}" for p in path)


def program_data(program):
    data = program.model_dump(mode="json", exclude_none=True, exclude_defaults=True)
    timings = [step["timing"] for step in data.get("steps", {}).values()]
    timings += [
        event[edge] for event in data.get("random", {}).values() for edge in ("start", "end")
    ]
    for timing in timings:
        source = timing.get("relative_to")
        if source and source.get("start_offset") == "0s":
            source.pop("start_offset")
    return data


def program_revision(program):
    # Presentation order matters to the editor, but never to scheduling.
    return hashlib.sha256(
        json.dumps(program_data(program), ensure_ascii=False).encode()
    ).hexdigest()


def step_order(program):
    children = {key: [] for key in program.steps}
    degrees = dict.fromkeys(program.steps, 0)
    for key, item in program.steps.items():
        source = item.timing.relative_to
        if source and source.step:
            parent = source.step
            if parent not in children:
                raise ProgramError(
                    [
                        Issue(
                            "dangling_step",
                            f"Unknown step {parent}",
                            ("steps", key, "timing", "relative_to", "step"),
                        )
                    ]
                )
            children[parent].append(key)
            degrees[key] += 1
    ready = [key for key, degree in degrees.items() if not degree]
    heapq.heapify(ready)
    result = []
    while ready:
        key = heapq.heappop(ready)
        result.append(key)
        for child in sorted(children[key]):
            degrees[child] -= 1
            if not degrees[child]:
                heapq.heappush(ready, child)
    if len(result) != len(children):
        raise ProgramError(
            [
                Issue(
                    "reference_cycle",
                    "Cyclic step dependencies: "
                    + ", ".join(key for key in degrees if degrees[key]),
                    ("steps",),
                )
            ]
        )
    return tuple(result)


def random_order(program):
    children = {key: [] for key in program.random}
    degrees = dict.fromkeys(program.random, 0)
    for key, item in program.random.items():
        source = item.start.relative_to
        if source and source.random:
            if source.random not in children:
                raise ProgramError(
                    [
                        Issue(
                            "dangling_random",
                            f"Unknown random event {source.random}",
                            ("random", key, "start", "relative_to", "random"),
                        )
                    ]
                )
            children[source.random].append(key)
            degrees[key] += 1
    ready = [key for key, degree in degrees.items() if not degree]
    heapq.heapify(ready)
    result = []
    while ready:
        key = heapq.heappop(ready)
        result.append(key)
        for child in sorted(children[key]):
            degrees[child] -= 1
            if not degrees[child]:
                heapq.heappush(ready, child)
    if len(result) != len(children):
        key = next(key for key in sorted(degrees) if degrees[key])
        raise ProgramError(
            [
                Issue(
                    "reference_cycle",
                    "Cyclic random event dependencies",
                    ("random", key, "start", "relative_to", "random"),
                )
            ]
        )
    return tuple(result)


def validate_light_data(data: Mapping, action: str = "turn_on") -> str | None:
    allowed = (
        {"transition"}
        if action in {"turn_off"}
        else {
            "brightness",
            "brightness_pct",
            "color_temp_kelvin",
            "transition",
            "hs_color",
            "rgb_color",
        }
    )
    if extra := set(data) - allowed:
        return f"Unsupported typed control data: {', '.join(sorted(extra))}"
    for key, bounds in {
        "brightness": (1, 255),
        "brightness_pct": (0.01, 100),
        "color_temp_kelvin": (1, 100000),
        "transition": (0, 604800),
    }.items():
        if key in data and (
            isinstance(data[key], bool)
            or not isinstance(data[key], (float, int))
            or not bounds[0] <= data[key] <= bounds[1]
        ):
            return f"{key} must be a number within {bounds[0]}–{bounds[1]}"
    if "brightness" in data and "brightness_pct" in data:
        return "Specify brightness or brightness_pct, not both"
    colors = [key for key in ("color_temp_kelvin", "hs_color", "rgb_color") if key in data]
    if len(colors) > 1:
        return "Choose one color setting per light intent"
    for key, ranges in {"hs_color": ((0, 360), (0, 100)), "rgb_color": ((0, 255),) * 3}.items():
        if key not in data:
            continue
        value = data[key]
        if not isinstance(value, (tuple, list)) or len(value) != len(ranges):
            return f"{key} has the wrong number of components"
        for component, (low, high) in zip(value, ranges, strict=True):
            if (
                isinstance(component, bool)
                or not isinstance(component, (int, float))
                or not low <= component <= high
            ):
                return f"{key} components are outside the supported range"
    return None


def validate_program(data: Program | Mapping[str, Any]) -> Program:
    try:
        program = data if isinstance(data, Program) else Program.model_validate(data)
    except ValidationError as err:
        raise ProgramError(
            [Issue("schema", i["msg"], tuple(i["loc"])) for i in err.errors()]
        ) from err
    issues = []
    if len(program.steps) + len(program.random) > 5000:
        issues.append(
            Issue("program_size", "A program supports at most 5000 steps and random events")
        )
    for path, timing in program_timings(program, enabled_only=False):
        random_end = path[0] == "random" and path[-1] == "end"
        random_start = path[0] == "random" and path[-1] == "start"
        if timing.duration and not random_end:
            issues.append(
                Issue(
                    "timing_mode",
                    "Duration is only supported for a random window end",
                    path + ("duration",),
                )
            )
        source = timing.relative_to
        if source and source.random and not random_start:
            issues.append(
                Issue(
                    "timing_source",
                    "Random event references are only supported for a window start",
                    path + ("relative_to", "random"),
                )
            )
        if source and source.step and source.step not in program.steps:
            issues.append(
                Issue(
                    "dangling_step", f"Unknown step {source.step}", path + ("relative_to", "step")
                )
            )
    for path, step in program_actions(program, enabled_only=False):
        action = step.action
        if {"entity_id", "device_id", "area_id"} & step.data.keys():
            issues.append(
                Issue(
                    "data_targets",
                    "Choose entities using entities, not service data",
                    path + ("data",),
                )
            )
        if action in {"turn_on", "turn_off"}:
            if any(not e.startswith(("light.", "switch.")) for e in step.entities):
                issues.append(
                    Issue(
                        "control_targets",
                        "Turn on/off requires lights or switches",
                        path + ("entities",),
                    )
                )
            if step.data:
                issues.append(
                    Issue(
                        "control_data",
                        "Use an entity service action or scene to specify service data",
                        path + ("data",),
                    )
                )
        elif action in {"light.turn_on", "light.turn_off", "switch.turn_on", "switch.turn_off"}:
            domain, service = action.split(".")
            if any(not e.startswith(domain + ".") for e in step.entities):
                issues.append(
                    Issue(
                        "control_targets",
                        f"{action} requires {domain} entities",
                        path + ("entities",),
                    )
                )
            problem = (
                validate_light_data(step.data, service)
                if domain == "light"
                else ("Switch calls take no brightness or color data" if step.data else None)
            )
            if problem:
                issues.append(Issue("control_data", problem, path + ("data",)))
        elif action == "scene.turn_on":
            if len(step.entities) != 1 or not step.entities[0].startswith("scene."):
                issues.append(
                    Issue("scene_targets", "Choose one Home Assistant scene", path + ("entities",))
                )
        elif action == "event.fire":
            issues.append(Issue("action", "Choose an entity service action", path + ("action",)))
    if issues:
        raise ProgramError(issues)
    step_order(program)
    random_order(program)
    return program


def behavior_hash(program):
    data = program.model_dump(mode="json", exclude_none=True)
    data.pop("name")
    for step in data["steps"].values():
        step.pop("name", None)
    for event in data["random"].values():
        event.pop("name", None)
    if not data["random"]:
        data.pop("random")
    return hashlib.sha256(
        json.dumps(data, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
    ).hexdigest()


def validation_warnings(program):
    return ()


def rename_identifier(program, kind, old, new):
    if kind not in {"step", "random"}:
        raise ProgramError([Issue("identifier_kind", "Choose step or random IDs")])
    data = program_data(program)
    collection = "steps" if kind == "step" else "random"
    items = data.get(collection, {})
    if old not in items:
        raise ProgramError([Issue("unknown_id", f"Unknown {kind} {old}")])
    if new != old and new in items:
        raise ProgramError([Issue("duplicate_id", f"{kind} {new} already exists")])
    data[collection] = {(new if key == old else key): value for key, value in items.items()}
    if kind == "step":
        timings = [step["timing"] for step in data.get("steps", {}).values()]
        timings += [
            event[edge] for event in data.get("random", {}).values() for edge in ("start", "end")
        ]
        for timing in timings:
            source = timing.get("relative_to")
            if source and source.get("step") == old:
                source["step"] = new
    else:
        for event in data.get("random", {}).values():
            source = event["start"].get("relative_to")
            if source and source.get("random") == old:
                source["random"] = new
    return validate_program(data)
