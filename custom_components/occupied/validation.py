"""Shared strict validation, stable references, and normalized behavior identity."""

import hashlib
import heapq
import json
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from typing import Any, Literal

from pydantic import ValidationError

from .models import (
    Activity,
    ActivityWindow,
    Condition,
    Program,
    Step,
    Targets,
    effective_days,
    effective_handover,
    merge_defaults,
)

type ModelPath = tuple[str | int, ...]


@dataclass(frozen=True)
class Issue:
    code: str
    message: str
    path: ModelPath = ()
    severity: Literal["error", "warning", "info"] = "error"
    line: int | None = None
    column: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self) | {"path": format_path(self.path)}


class ProgramError(ValueError):
    def __init__(self, issues: list[Issue] | tuple[Issue, ...]):
        self.issues = tuple(issues)
        super().__init__("; ".join(f"{format_path(item.path)}: {item.message}" for item in issues))


def format_path(path: ModelPath) -> str:
    result = "$"
    for part in path:
        result += f"[{part}]" if isinstance(part, int) else f".{part}"
    return result


def resolve_targets(program: Program, targets: Targets) -> tuple[str, ...]:
    groups = {group.id: group.entities for group in program.groups}
    entities = set(targets.entities)
    for group_id in targets.groups:
        if group_id not in groups:
            raise ProgramError([Issue("dangling_group", f"Unknown target group {group_id}")])
        entities.update(groups[group_id])
    return tuple(sorted(entities))


def items_with_paths(program: Program):
    for r_index, routine in enumerate(program.routines):
        for kind in ("steps", "activities", "activity_windows"):
            for index, item in enumerate(getattr(routine, kind)):
                yield routine, item, ("routines", r_index, kind, index)


def actions_with_paths(program: Program):
    for routine, item, path in items_with_paths(program):
        fields = (
            ("actions",)
            if isinstance(item, Step)
            else ("on_start", "on_end")
            if isinstance(item, Activity)
            else ()
        )
        for field in fields:
            for index, action in enumerate(getattr(item, field)):
                yield routine, item, action, path + (field, index)


def all_targets(program: Program):
    yield program.lighting.managed_targets, ("lighting", "managed_targets")
    for index, baseline in enumerate(program.lighting.baseline):
        yield baseline.targets, ("lighting", "baseline", index, "targets")
    for _, _, action, path in actions_with_paths(program):
        yield action.targets, path + ("targets",)
    for _, item, path in items_with_paths(program):
        if isinstance(item, ActivityWindow):
            yield item.targets, path + ("targets",)


def step_references(item):
    if isinstance(item, (Step, Activity)) and item.when.relative_to is not None:
        yield item.when.relative_to, ("when", "relative_to")
    between = (
        item.between
        if isinstance(item, ActivityWindow)
        else item.within
        if isinstance(item, Activity)
        else None
    )
    if between is not None:
        field = "between" if isinstance(item, ActivityWindow) else "within"
        for side in ("start", "end"):
            if reference := getattr(between, side).step:
                yield reference, (field, side, "step")


def step_order(program: Program) -> tuple[str, ...]:
    """A stable Kahn traversal; names and YAML list order never break graph ties."""
    steps = {item.id: item for _, item, _ in items_with_paths(program) if isinstance(item, Step)}
    children = {item_id: [] for item_id in steps}
    degrees = {item_id: 0 for item_id in steps}
    for item_id, item in steps.items():
        if parent := item.when.relative_to:
            if parent not in steps:
                raise ProgramError([Issue("dangling_step", f"Unknown step anchor {parent}")])
            children[parent].append(item_id)
            degrees[item_id] += 1
    ready = [item_id for item_id, degree in degrees.items() if not degree]
    heapq.heapify(ready)
    result = []
    while ready:
        item_id = heapq.heappop(ready)
        result.append(item_id)
        for child in sorted(children[item_id]):
            degrees[child] -= 1
            if not degrees[child]:
                heapq.heappush(ready, child)
    if len(result) != len(steps):
        cyclic = sorted(item_id for item_id, degree in degrees.items() if degree)
        raise ProgramError(
            [Issue("reference_cycle", f"Cyclic step dependencies: {', '.join(cyclic)}")]
        )
    return tuple(result)


def validate_light_data(data: Mapping, action: str = "turn_on") -> str | None:
    allowed = (
        {"transition"}
        if action in {"turn_off", "safety_off"}
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
    """Validate structure, domain rules, identities, dependency graph and weekdays."""
    try:
        program = data if isinstance(data, Program) else Program.model_validate(data)
    except ValidationError as err:
        raise ProgramError(
            [
                Issue("schema", item["msg"], tuple(item["loc"]))
                for item in err.errors(include_url=False)
            ]
        ) from err
    errors: list[Issue] = []
    identities: dict[str, set[str]] = {
        kind: set() for kind in ("groups", "routines", "steps", "activities", "activity_windows")
    }
    for kind in ("groups", "routines"):
        for index, resource in enumerate(getattr(program, kind)):
            if resource.id in identities[kind]:
                errors.append(
                    Issue("duplicate_id", f"Duplicate {kind} ID {resource.id}", (kind, index, "id"))
                )
            identities[kind].add(resource.id)
    collected = list(items_with_paths(program))
    if len(collected) > 5000:
        errors.append(
            Issue("program_size", "A program supports at most 5000 scheduling items", ("routines",))
        )
    for routine, item, path in collected:
        kind = path[-2]
        if item.id in identities[kind]:
            errors.append(Issue("duplicate_id", f"Duplicate {kind} ID {item.id}", path + ("id",)))
        identities[kind].add(item.id)
        if not effective_days(routine, item):
            errors.append(
                Issue("empty_days", "The effective weekday selection is empty", path + ("days",))
            )
        if item.days is not None and not set(item.days) <= set(routine.days):
            errors.append(
                Issue(
                    "weekday_widening",
                    "An item may only narrow its routine's weekdays",
                    path + ("days",),
                )
            )
    for r_index, routine in enumerate(program.routines):
        if not routine.days:
            errors.append(
                Issue("empty_days", "A routine must select weekdays", ("routines", r_index, "days"))
            )
    for targets, path in all_targets(program):
        for index, group in enumerate(targets.groups):
            if group not in identities["groups"]:
                errors.append(
                    Issue(
                        "dangling_group", f"Unknown target group {group}", path + ("groups", index)
                    )
                )
    steps = {item.id: (routine, item) for routine, item, _ in collected if isinstance(item, Step)}
    for routine, item, path in collected:
        for reference, field_path in step_references(item):
            if reference not in steps:
                errors.append(
                    Issue("dangling_step", f"Unknown step anchor {reference}", path + field_path)
                )
            elif item.missing_anchor == "error":
                parent_routine, parent = steps[reference]
                if not set(effective_days(routine, item)) <= set(
                    effective_days(parent_routine, parent)
                ):
                    errors.append(
                        Issue(
                            "anchor_days",
                            f"Step {reference} is unavailable on some selected days; "
                            "narrow days or choose missing_anchor: skip",
                            path + field_path,
                        )
                    )
    if errors:
        raise ProgramError(errors)
    try:
        step_order(program)
    except ProgramError as err:
        errors.extend(err.issues)
    for _routine, _item, action, path in actions_with_paths(program):
        targets = resolve_targets(program, action.targets)
        if not targets and not action.data and not action.resources:
            errors.append(
                Issue(
                    "empty_action",
                    "An action must specify targets, data, or declared resources",
                    path,
                )
            )
        if action.stagger is not None and action.stagger.lower < 0:
            errors.append(
                Issue("negative_stagger", "Action stagger must be nonnegative", path + ("stagger",))
            )
        if action.action in {"turn_on", "turn_off", "safety_off"}:
            if not targets or any(
                entity.split(".", 1)[0] not in {"light", "switch"} for entity in targets
            ):
                errors.append(
                    Issue(
                        "unsupported_shorthand",
                        "Typed controls support light/switch targets only",
                        path + ("targets",),
                    )
                )
            if problem := validate_light_data(action.data, action.action):
                errors.append(Issue("control_data", problem, path + ("data",)))
            if any(entity.startswith("switch.") for entity in targets) and set(action.data) - {
                "transition"
            }:
                errors.append(
                    Issue(
                        "switch_light_data",
                        "Separate light settings from switch controls",
                        path + ("data",),
                    )
                )
        elif action.action in {
            "light.turn_on",
            "light.turn_off",
            "switch.turn_on",
            "switch.turn_off",
        }:
            domain, service = action.action.split(".", 1)
            if not targets or any(not entity.startswith(domain + ".") for entity in targets):
                errors.append(
                    Issue(
                        "action_domain",
                        f"{action.action} requires {domain} targets",
                        path + ("targets",),
                    )
                )
            if domain == "light" and (problem := validate_light_data(action.data, service)):
                errors.append(Issue("control_data", problem, path + ("data",)))
            if domain == "switch" and action.data:
                errors.append(
                    Issue(
                        "control_data",
                        "Switch state controls do not accept light settings",
                        path + ("data",),
                    )
                )
        elif any(key in action.data for key in ("entity_id", "device_id", "area_id")):
            errors.append(
                Issue(
                    "target_in_data",
                    "Use the typed targets wrapper rather than targets inside service data",
                    path + ("data",),
                )
            )
    for routine, item, path in collected:
        defaults = merge_defaults(program, routine)
        if defaults.stagger.lower < 0:
            errors.append(Issue("negative_stagger", "Default stagger must be nonnegative", path))
        if isinstance(item, Activity):
            duration = item.duration or defaults.activities.duration
            if duration is None or duration.lower <= 0:
                errors.append(
                    Issue(
                        "activity_duration",
                        "A timed activity needs a positive fixed/ranged duration",
                        path + ("duration",),
                    )
                )
            if not item.resources or not item.on_start or not item.on_end:
                errors.append(
                    Issue(
                        "activity_lifecycle",
                        "Declare resources and explicit nonempty on_start/on_end actions",
                        path,
                    )
                )
        elif isinstance(item, ActivityWindow):
            targets = resolve_targets(program, item.targets)
            duration = item.on_duration or defaults.activity_windows.on_duration
            overlap = (
                item.overlap if item.overlap is not None else defaults.activity_windows.overlap
            )
            gap = item.min_gap if item.min_gap is not None else defaults.activity_windows.min_gap
            mode = item.target_mode or defaults.activity_windows.target_mode
            if not targets or any(
                entity.split(".")[0] not in {"light", "switch"} for entity in targets
            ):
                errors.append(
                    Issue(
                        "window_targets",
                        "Activity windows require light/switch targets",
                        path + ("targets",),
                    )
                )
            if duration.lower <= 0:
                errors.append(
                    Issue(
                        "window_duration",
                        "Window on_duration must be positive",
                        path + ("on_duration",),
                    )
                )
            if overlap and gap > 0:
                errors.append(
                    Issue(
                        "overlap_gap",
                        "Positive off-gaps require non-overlapping cycles",
                        path + ("min_gap",),
                    )
                )
            if mode in {"subset", "weighted_subset"}:
                size = item.subset_size
                if size is None or size.lower < 1 or size.upper > len(targets):
                    errors.append(
                        Issue(
                            "subset_size",
                            "Subset size must fit the expanded target set",
                            path + ("subset_size",),
                        )
                    )
            elif item.subset_size is not None:
                errors.append(
                    Issue(
                        "subset_size",
                        "subset_size is only used by subset modes",
                        path + ("subset_size",),
                    )
                )
            if set(item.weights) - set(targets):
                errors.append(
                    Issue(
                        "target_weights",
                        "Weights must refer to expanded window targets",
                        path + ("weights",),
                    )
                )
            if problem := validate_light_data(item.data):
                errors.append(Issue("control_data", problem, path + ("data",)))
            if any(entity.startswith("switch.") for entity in targets) and item.data:
                errors.append(
                    Issue(
                        "switch_light_data",
                        "Separate light settings from switch windows",
                        path + ("data",),
                    )
                )
    managed = set(resolve_targets(program, program.lighting.managed_targets))
    if any(not entity.startswith("light.") for entity in managed):
        errors.append(
            Issue(
                "managed_lights",
                "Managed lighting contains lights only",
                ("lighting", "managed_targets"),
            )
        )
    baselined: set[str] = set()
    for index, baseline in enumerate(program.lighting.baseline):
        targets = set(resolve_targets(program, baseline.targets))
        if targets - managed or targets & baselined:
            errors.append(
                Issue(
                    "lighting_baseline",
                    "Each baseline target must be managed and occur in at most one baseline",
                    ("lighting", "baseline", index),
                )
            )
        data = baseline.model_dump(exclude={"targets", "state"}, exclude_none=True)
        if problem := validate_light_data(data):
            errors.append(Issue("control_data", problem, ("lighting", "baseline", index)))
        baselined.update(targets)
    if errors:
        raise ProgramError(errors)
    return program


def validation_warnings(program: Program) -> tuple[Issue, ...]:
    """Explain valid but competing targets and intentionally unprojectable effects."""
    warnings = []
    managed = set(resolve_targets(program, program.lighting.managed_targets))
    baseline_targets = {
        entity
        for baseline in program.lighting.baseline
        for entity in resolve_targets(program, baseline.targets)
    }
    if missing := managed - baseline_targets:
        warnings.append(
            Issue(
                "undefined_baseline",
                f"Lights without a baseline are left alone: {', '.join(sorted(missing))}",
                ("lighting", "baseline"),
                "warning",
            )
        )
    uses: dict[str, set[str]] = {}
    for _, item, action, path in actions_with_paths(program):
        entities = resolve_targets(program, action.targets)
        for entity in entities:
            uses.setdefault(entity, set()).add(item.id)
        if action.action not in {
            "turn_on",
            "turn_off",
            "safety_off",
            "light.turn_on",
            "light.turn_off",
            "switch.turn_on",
            "switch.turn_off",
        }:
            warnings.append(
                Issue(
                    "opaque_action",
                    f"{action.action} has no inferred lighting projection or inverse; "
                    "effects must be declared as resources",
                    path,
                    "warning",
                )
            )
    for _, item, _ in items_with_paths(program):
        if isinstance(item, ActivityWindow):
            for entity in resolve_targets(program, item.targets):
                uses.setdefault(entity, set()).add(item.id)
    for entity, owners in sorted(uses.items()):
        if len(owners) > 1:
            warnings.append(
                Issue(
                    "shared_target",
                    f"{entity} is shared by {', '.join(sorted(owners))}; "
                    "routine/safety intents override window leases",
                    severity="warning",
                )
            )
    for _, item, path in items_with_paths(program):
        if isinstance(item, Step):
            seen: dict[str, str] = {}
            for index, action in enumerate(item.actions):
                for entity in resolve_targets(program, action.targets):
                    if entity in seen and seen[entity] != action.action:
                        warnings.append(
                            Issue(
                                "ordered_action_conflict",
                                f"Ordered actions apply {seen[entity]} "
                                f"then {action.action} to {entity}",
                                path + ("actions", index),
                                "warning",
                            )
                        )
                    seen[entity] = action.action
    return tuple(warnings)


def condition_data(condition: Condition) -> dict[str, Any]:
    if condition.condition != "state":
        return {
            "condition": condition.condition,
            "conditions": [condition_data(child) for child in condition.conditions],
        }
    return condition.model_dump(mode="json", exclude={"conditions"}, exclude_none=True)


def program_data(program: Program) -> dict[str, Any]:
    """Export schema choices and shared defaults without expanding every item."""
    data = program.model_dump(mode="json", exclude_none=True)
    data["activation"]["conditions"] = [
        condition_data(item) for item in program.activation.conditions
    ]
    for routine, raw in zip(program.routines, data["routines"], strict=True):
        for activity, raw_activity in zip(routine.activities, raw["activities"], strict=True):
            for field in ("start_conditions", "ownership_conditions"):
                raw_activity[field] = [condition_data(item) for item in getattr(activity, field)]
    return data


def _without_metadata(data: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in data.items() if key not in {"name", "description"}}


def behavior_data(program: Program) -> dict[str, Any]:
    """Hash resolved behavior, while preserving ordering inside action sequences/data."""
    data = _without_metadata(program_data(program))
    data.pop("defaults")
    data["groups"] = sorted(
        [_without_metadata(group) for group in data["groups"]], key=lambda item: item["id"]
    )
    data["lighting"]["handover"] = effective_handover(program).model_dump(mode="json")
    data["lighting"]["managed_targets"] = list(
        resolve_targets(program, program.lighting.managed_targets)
    )
    data["lighting"]["baseline"] = sorted(
        [
            baseline.model_dump(mode="json", exclude={"targets"}, exclude_none=True)
            | {"targets": list(resolve_targets(program, baseline.targets))}
            for baseline in program.lighting.baseline
        ],
        key=lambda item: item["targets"],
    )
    for group, raw in zip(
        sorted(program.groups, key=lambda item: item.id), data["groups"], strict=True
    ):
        raw["handover"] = effective_handover(program, group).model_dump(mode="json")
    normalized_routines = []
    for routine in program.routines:
        defaults = merge_defaults(program, routine)
        raw = _without_metadata(routine.model_dump(mode="json", exclude_none=True))
        raw.pop("defaults")
        raw["days"] = sorted(set(routine.days))
        for field in ("steps", "activities", "activity_windows"):
            values = []
            for item in getattr(routine, field):
                value = _without_metadata(item.model_dump(mode="json", exclude_none=True))
                value["days"] = list(effective_days(routine, item))
                value["probability"] = (
                    item.probability if item.probability is not None else defaults.probability
                )
                value["time_distribution"] = item.time_distribution or defaults.time_distribution
                if isinstance(item, (Step, Activity)):
                    value["when"]["distribution"] = (
                        item.when.distribution or value["time_distribution"]
                    )
                if isinstance(item, ActivityWindow):
                    for key in ("on_duration", "min_gap", "overlap", "target_mode"):
                        setting = getattr(item, key)
                        value[key] = (
                            item.model_dump(mode="json")[key]
                            if setting is not None
                            else defaults.activity_windows.model_dump(mode="json")[key]
                        )
                    value["targets"] = list(resolve_targets(program, item.targets))
                    value["groups"] = sorted(item.targets.groups)
                elif isinstance(item, Activity):
                    duration = item.duration or defaults.activities.duration
                    value["duration"] = duration.model_dump(mode="json", exclude_none=True)
                    value["stop_behavior"] = item.stop_behavior or defaults.activities.stop_behavior
                    value["resources"] = sorted(set(item.resources))
                for actions_field in ("actions", "on_start", "on_end"):
                    if not hasattr(item, actions_field):
                        continue
                    actions = []
                    for action in getattr(item, actions_field):
                        resolved = action.model_dump(mode="json", exclude_none=True)
                        resolved["targets"] = list(resolve_targets(program, action.targets))
                        resolved["resources"] = sorted(set(action.resources))
                        resolved["target_order"] = action.target_order or defaults.target_order
                        resolved["stagger"] = (action.stagger or defaults.stagger).model_dump(
                            mode="json", exclude_none=True
                        )
                        actions.append(resolved)
                    value[actions_field] = actions
                values.append(value)
            raw[field] = sorted(values, key=lambda item: item["id"])
        normalized_routines.append(raw)
    data["routines"] = sorted(normalized_routines, key=lambda item: item["id"])
    return data


def behavior_hash(program: Program) -> str:
    return hashlib.sha256(
        json.dumps(
            behavior_data(program), sort_keys=True, separators=(",", ":"), allow_nan=False
        ).encode()
    ).hexdigest()


def rename_identifier(program: Program, kind: str, old: str, new: str) -> Program:
    """Rewrite typed references in a new validated transaction; opaque data stays untouched."""
    fields = {
        "group": "groups",
        "routine": "routines",
        "step": "steps",
        "activity": "activities",
        "window": "activity_windows",
    }
    if kind not in fields:
        raise ProgramError([Issue("identifier_kind", f"Unknown resource kind {kind}")])
    field = fields[kind]
    data = program_data(program)
    resources = (
        data[field]
        if kind in {"group", "routine"}
        else [item for routine in data["routines"] for item in routine[field]]
    )
    matches = [item for item in resources if item["id"] == old]
    if not matches:
        raise ProgramError([Issue("unknown_id", f"Unknown {kind} ID {old}")])
    if new != old and any(item["id"] == new for item in resources):
        raise ProgramError([Issue("duplicate_id", f"{kind} ID {new} already exists")])
    matches[0]["id"] = new
    if kind == "group":
        for _, path in all_targets(program):
            target = data
            for component in path:
                target = target[component]
            target["groups"] = [new if value == old else value for value in target["groups"]]
    elif kind == "step":
        for _, item, path in items_with_paths(program):
            for reference, reference_path in step_references(item):
                if reference != old:
                    continue
                target = data
                for component in path + reference_path[:-1]:
                    target = target[component]
                target[reference_path[-1]] = new
    return validate_program(data)
