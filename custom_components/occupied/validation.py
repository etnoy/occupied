"""Strict step validation, typed references, and stable behavior identity."""

import hashlib
import heapq
import json
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from datetime import time
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
    details: dict[str, str] | None = None

    def to_dict(self):
        result = asdict(self) | {"path": format_path(self.path), "model_path": list(self.path)}
        if self.details is None:
            result.pop("details")
        return result


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
    timings += [
        timing[key]
        for timing in tuple(timings)
        for key in ("latest_at", "only_before")
        if key in timing
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


def _clock_window_bounds(value):
    def seconds(text):
        parts = [int(part) for part in text.split(":")]
        return parts[0] * 3600 + parts[1] * 60 + (parts[2] if len(parts) > 2 else 0)

    low = seconds(value.start)
    high = seconds(value.end or value.start)
    return low, high + (86400 if high < low else 0)


def validate_program(data: Program | Mapping[str, Any]) -> Program:
    try:
        program = data if isinstance(data, Program) else Program.model_validate(data)
    except ValidationError as err:
        raise ProgramError(
            [Issue("schema", i["msg"], tuple(i["loc"])) for i in err.errors()]
        ) from err
    issues = []
    off_entities = program.run_condition.off_entities if program.run_condition else []
    off_indices = {entity: index for index, entity in enumerate(off_entities)}
    conflicting_entities = set()
    if len(program.steps) + len(program.random) > 5000:
        issues.append(
            Issue("program_size", "A program supports at most 5000 steps and random events")
        )
    for key, event in program.random.items():
        if event.start.absolute_time and event.end.absolute_time:
            start_low, start_high = _clock_window_bounds(event.start.absolute_time)
            end_low, end_high = _clock_window_bounds(event.end.absolute_time)
            if end_high < start_low:
                end_low, end_high = end_low + 86400, end_high + 86400
            if end_low < start_high and end_high >= start_low:
                issues.append(
                    Issue(
                        "random_window_overlap",
                        "Start and end windows must not overlap",
                        ("random", key, "end"),
                    )
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
        for index, entity in enumerate(step.entities):
            if entity not in off_indices:
                continue
            conflicting_entities.add(entity)
            entity_path = entity if isinstance(step.entities, dict) else index
            issues.append(
                Issue(
                    "off_entity_conflict",
                    f"{entity} is also in Extra entities to turn off. "
                    "Remove it from that list or this action.",
                    path + ("entities", entity_path),
                    details={"entity_id": entity},
                )
            )
        if step.stagger.enabled and not (
            step.action
            in {
                "turn_on",
                "turn_off",
                "light.turn_on",
                "light.turn_off",
                "switch.turn_on",
                "switch.turn_off",
                "set_state",
            }
            and all(entity.startswith(("light.", "switch.")) for entity in step.entities)
            and (
                step.action != "set_state"
                or all(
                    settings.get("state") in {"on", "off"} for settings in step.entities.values()
                )
            )
        ):
            issues.append(
                Issue(
                    "stagger_targets",
                    "Staggering requires explicit light/switch on or off targets",
                    path + ("stagger",),
                )
            )
        action = step.action
        if {"entity_id", "device_id", "area_id"} & step.data.keys():
            issues.append(
                Issue(
                    "data_targets",
                    "Choose entities using entities, not service data",
                    path + ("data",),
                )
            )
        if action == "set_state":
            if step.data:
                issues.append(
                    Issue(
                        "control_data", "Put settings under each entity, not data", path + ("data",)
                    )
                )
            for entity, settings in step.entities.items():
                domain = entity.split(".")[0]
                entry_path = path + ("entities", entity)
                state = settings.get("state")
                data = {key: value for key, value in settings.items() if key != "state"}
                problem = None
                if domain in {"light", "switch"}:
                    if not isinstance(state, str) or state not in {"on", "off"}:
                        problem = 'Specify state as the quoted string "on" or "off"'
                    elif domain == "switch":
                        if data:
                            problem = "Switch entries accept state only"
                    elif "brightness_pct" in data:
                        problem = "Use brightness (an integer from 1 to 255), not brightness_pct"
                    elif "brightness" in data and type(data["brightness"]) is not int:
                        problem = "brightness must be an integer from 1 to 255"
                    elif "rgb_color" in data and (
                        not isinstance(data["rgb_color"], list)
                        or any(type(v) is not int for v in data["rgb_color"])
                    ):
                        problem = "rgb_color requires three integers from 0 to 255"
                    else:
                        problem = validate_light_data(data, "turn_" + state)
                elif domain == "cover":
                    if set(settings) - {"state", "position"}:
                        problem = "Cover entries accept state or position only"
                    elif ("state" in settings) == ("position" in settings):
                        problem = "Specify either cover state or position, not both"
                    elif "state" in settings and state not in ("open", "closed"):
                        problem = 'Cover state must be "open" or "closed"'
                    elif "position" in settings and (
                        type(settings["position"]) is not int
                        or not 0 <= settings["position"] <= 100
                    ):
                        problem = "Cover position must be an integer from 0 to 100"
                else:
                    problem = "State mappings support lights, switches, and covers only"
                if problem:
                    issues.append(Issue("entity_state", problem, entry_path))
        elif action in {"turn_on", "turn_off"}:
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
    for key, event in program.random.items():
        if event.on.stagger_span >= event.min_duration:
            issues.append(
                Issue(
                    "stagger_duration",
                    "Start stagger periods must be shorter than min_duration",
                    ("random", key, "on"),
                )
            )
    for entity in off_entities:
        if entity in conflicting_entities:
            issues.append(
                Issue(
                    "off_entity_conflict",
                    f"{entity} is also used by a step or random event (including disabled ones). "
                    "Remove it from this list or those actions.",
                    ("run_condition", "off_entities", off_indices[entity]),
                    details={"entity_id": entity},
                )
            )
    if issues:
        raise ProgramError(issues)
    dynamic = set()
    for key in step_order(program):
        timing = program.steps[key].timing
        source = timing.relative_to
        if timing.lux:
            dynamic.add(key)
        elif source and source.step in dynamic:
            dynamic.add(key)
            if source.start_offset < 0 or timing.latest_at or timing.only_before:
                raise ProgramError(
                    [
                        Issue(
                            "lux_dependency",
                            "Steps after a light-level Step require "
                            "nonnegative offsets and no timing caps",
                            ("steps", key, "timing"),
                        )
                    ]
                )
    for key, event in program.random.items():
        if any(t.relative_to and t.relative_to.step in dynamic for t in (event.start, event.end)):
            raise ProgramError(
                [
                    Issue(
                        "lux_dependency",
                        "Random windows cannot depend on light-level Steps",
                        ("random", key),
                    )
                ]
            )
    random_order(program)
    return program


def behavior_hash(program):
    data = program.model_dump(mode="json", exclude_none=True)
    # Execution policy must not resample plans or change authored event identities.
    data.pop("run_condition", None)

    def normalize_action(action):
        if not action["stagger"]["enabled"]:
            action.pop("stagger")
        for child in action.get("actions", []):
            normalize_action(child)

    for step in data["steps"].values():
        normalize_action(step)
    for event in data["random"].values():
        normalize_action(event["on"])
        normalize_action(event["off"])
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


def early_cap_warning(path):
    return Issue(
        "latest_at_before_start",
        "The source-date latest_at limit precedes the earliest base time and can move "
        "this step before its timing window. Check the date and cap.",
        path + ("latest_at",),
        "warning",
    )


def validation_warnings(program):
    warnings = [
        early_cap_warning(("steps", key, "timing"))
        for key, step in program.steps.items()
        if (base := step.timing.absolute_time)
        and (cap := step.timing.latest_at)
        and cap.absolute_time
        and time.fromisoformat(cap.absolute_time.start) < time.fromisoformat(base.start)
    ]
    if not program.random:
        return tuple(warnings)

    # Conservative source-date ranges expose overlap risk before an editor has
    # a dated solar/entity snapshot or a sampled parent step.
    def bounds(timing, steps, random_ends):
        if timing.absolute_time:
            return _clock_window_bounds(timing.absolute_time)
        source = timing.relative_to
        low, high = (
            steps[source.step]
            if source.step
            else random_ends[source.random]
            if source.random
            else (0, 86400)
        )
        return low + source.start_offset, high + source.latest_offset

    steps, random_ends = {}, {}
    for key in step_order(program):
        timing = program.steps[key].timing
        low, high = bounds(timing, steps, random_ends)
        if cap := timing.latest_at:
            if cap.absolute_time:
                clock = time.fromisoformat(cap.absolute_time.start)
                cap_low = cap_high = clock.hour * 3600 + clock.minute * 60 + clock.second
            else:
                cap_low = cap.relative_to.start_offset
                cap_high = 86400 + cap_low
            low, high = min(low, cap_low), min(high, cap_high)
        steps[key] = low, high
    for key in random_order(program):
        event = program.random[key]
        start_low, start_high = bounds(event.start, steps, random_ends)
        if event.end.duration:
            random_ends[key] = (
                start_low + event.end.duration.min,
                start_high + event.end.duration.latest_duration,
            )
            continue
        end_low, end_high = bounds(event.end, steps, random_ends)
        random_ends[key] = end_low, end_high + 86400
        if (
            event.enabled
            and event.max_count
            and not (event.start.absolute_time and event.end.absolute_time)
            and end_low < start_high
            and end_high >= start_low
        ):
            warnings.append(
                Issue(
                    "random_window_overlap_risk",
                    "Dynamic start and end ranges can overlap; "
                    "overlapping dates skip this random item",
                    ("random", key, "end"),
                    "warning",
                )
            )
    return tuple(warnings)


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
