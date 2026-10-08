"""Versioned, serializable behavior model with no Home Assistant API dependency."""

import math
import re
from decimal import Decimal
from typing import Annotated, Any, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    JsonValue,
    PlainSerializer,
    StringConstraints,
    field_validator,
    model_validator,
)

WEEKDAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
type Day = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
type Distribution = Literal["uniform", "triangular"]
type TargetMode = Literal["all", "one", "subset", "weighted_subset"]
Identifier = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_-]*$")]
EntityId = Annotated[str, StringConstraints(pattern=r"^[a-z_][a-z0-9_]*\.[a-z0-9_]+$")]
Clock = Annotated[str, StringConstraints(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$")]
Probability = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]


def parse_duration(value: Any) -> float:
    """Read signed ordered h/m/s units; YAML numbers and colon durations are rejected."""
    if (
        not isinstance(value, str)
        or not re.fullmatch(
            r"[+-]?(?:\d+(?:\.\d+)?h)?(?:\d+(?:\.\d+)?m)?(?:\d+(?:\.\d+)?s)?", value
        )
        or value in {"", "+", "-"}
    ):
        raise ValueError("Use an explicit duration such as 10s, 20m, 2h30m, or -30m")
    sign = -1 if value.startswith("-") else 1
    seconds = float(
        sum(
            Decimal(number) * {"h": 3600, "m": 60, "s": 1}[unit]
            for number, unit in re.findall(r"(\d+(?:\.\d+)?)([hms])", value)
        )
    )
    if not math.isfinite(seconds) or seconds > 7 * 86400:
        raise ValueError("Duration must be finite and no greater than seven days")
    return sign * seconds


def format_duration(value: float) -> str:
    sign = "-" if value < 0 else ""
    remaining = Decimal(str(abs(value)))
    hours, remaining = divmod(remaining, 3600)
    minutes, seconds = divmod(remaining, 60)
    parts = []
    if hours:
        parts.append(f"{int(hours)}h")
    if minutes:
        parts.append(f"{int(minutes)}m")
    if seconds or not parts:
        parts.append(f"{seconds.normalize():f}s")
    return sign + "".join(parts)


SignedDuration = Annotated[float, BeforeValidator(parse_duration), PlainSerializer(format_duration)]
Duration = Annotated[SignedDuration, Field(ge=0)]
PositiveDuration = Annotated[SignedDuration, Field(gt=0)]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, validate_default=True)


class DurationRange(Model):
    fixed: SignedDuration | None = None
    min: SignedDuration | None = None
    max: SignedDuration | None = None
    mode: SignedDuration | None = None

    @model_validator(mode="after")
    def valid_bounds(self):
        if self.fixed is not None:
            if self.min is not None or self.max is not None or self.mode is not None:
                raise ValueError("Choose fixed or min/max, not both")
        elif self.min is None or self.max is None or self.min > self.max:
            raise ValueError("Require min <= max")
        elif self.mode is not None and not self.min <= self.mode <= self.max:
            raise ValueError("mode must be within min/max")
        return self

    @property
    def lower(self) -> float:
        return self.fixed if self.fixed is not None else self.min

    @property
    def upper(self) -> float:
        return self.fixed if self.fixed is not None else self.max


class CountRange(Model):
    fixed: Annotated[int, Field(ge=0, le=1000, strict=True)] | None = None
    min: Annotated[int, Field(ge=0, le=1000, strict=True)] | None = None
    max: Annotated[int, Field(ge=0, le=1000, strict=True)] | None = None

    @model_validator(mode="after")
    def valid_bounds(self):
        if self.fixed is not None:
            if self.min is not None or self.max is not None:
                raise ValueError("Choose fixed or min/max, not both")
        elif self.min is None or self.max is None or self.min > self.max:
            raise ValueError("Require min <= max")
        return self

    @property
    def lower(self) -> int:
        return self.fixed if self.fixed is not None else self.min

    @property
    def upper(self) -> int:
        return self.fixed if self.fixed is not None else self.max


class Targets(Model):
    groups: tuple[Identifier, ...] = ()
    entities: tuple[EntityId, ...] = ()

    @field_validator("groups", "entities")
    @classmethod
    def unique_sorted(cls, value):
        return tuple(sorted(set(value)))


class Condition(Model):
    condition: Literal["state", "and", "or", "not"]
    entity_id: EntityId | tuple[EntityId, ...] | None = None
    state: str | tuple[str, ...] | None = None
    attribute: str | None = None
    match: Literal["all", "any"] | None = None
    conditions: tuple[Condition, ...] = ()

    @model_validator(mode="after")
    def valid_condition(self):
        if self.condition == "state":
            if not self.entity_id or self.state is None or self.state == () or self.conditions:
                raise ValueError(
                    "State conditions require entity_id and a scalar/nonempty state list"
                )
        elif not self.conditions or any(
            value is not None
            for value in (
                self.entity_id,
                self.state,
                self.attribute,
                self.match,
            )
        ):
            raise ValueError("Boolean conditions contain a nonempty conditions list only")
        return self


class Activation(Model):
    conditions: tuple[Condition, ...] = ()


class ClockRange(Model):
    earliest: Clock
    latest: Clock
    cross_midnight: bool = False
    mode: Clock | None = None


class SunRange(Model):
    sun: Literal["sunrise", "sunset"]
    offset_range: DurationRange = Field(default_factory=lambda: DurationRange(fixed="0s"))
    fallback: Clock | None = None


class When(Model):
    clock_range: ClockRange | None = None
    sun_range: SunRange | None = None
    relative_to: Identifier | None = None
    offset_range: DurationRange | None = None
    distribution: Distribution | None = None

    @model_validator(mode="after")
    def one_anchor(self):
        if (
            sum(value is not None for value in (self.clock_range, self.sun_range, self.relative_to))
            != 1
        ):
            raise ValueError("Choose exactly one clock_range, sun_range, or relative_to")
        if (self.relative_to is None) != (self.offset_range is None):
            raise ValueError("relative_to and offset_range must be supplied together")
        return self


class Anchor(Model):
    step: Identifier | None = None
    clock: Clock | None = None
    sun: Literal["sunrise", "sunset"] | None = None
    offset: SignedDuration = "0s"
    day_offset: Annotated[int, Field(ge=0, le=1, strict=True)] = 0
    fallback: Clock | None = None

    @model_validator(mode="after")
    def one_anchor(self):
        if sum(value is not None for value in (self.step, self.clock, self.sun)) != 1:
            raise ValueError("Choose exactly one step, clock, or sun anchor")
        if self.fallback is not None and self.sun is None:
            raise ValueError("fallback is only valid for a sun anchor")
        if self.day_offset and self.step is not None:
            raise ValueError("Step anchors retain their dependency date; use offset instead")
        return self


class Between(Model):
    start: Anchor
    end: Anchor
    cross_midnight: bool = False


class Action(Model):
    action: Annotated[
        str,
        StringConstraints(
            pattern=r"^(?:turn_on|turn_off|safety_off|[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)$"
        ),
    ]
    targets: Targets = Field(default_factory=Targets)
    data: dict[str, JsonValue] = Field(default_factory=dict)
    resources: tuple[EntityId, ...] = ()
    target_order: Literal["ordered", "shuffled"] | None = None
    stagger: DurationRange | None = None
    replay_safe: bool = False


class PartialHandover(Model):
    duration: Duration | None = None
    target: Literal["projected_state_at_completion"] | None = None
    dimming: Literal["auto", "stepped_only"] | None = None
    non_dimmable: Literal["stagger"] | None = None
    step_interval: PositiveDuration | None = None
    cancel_behavior: Literal["hold_current"] | None = None


class Handover(Model):
    duration: Duration = "10m"
    target: Literal["projected_state_at_completion"] = "projected_state_at_completion"
    dimming: Literal["auto", "stepped_only"] = "auto"
    non_dimmable: Literal["stagger"] = "stagger"
    step_interval: PositiveDuration = "30s"
    cancel_behavior: Literal["hold_current"] = "hold_current"


class Group(Model):
    id: Identifier
    name: str
    description: str | None = None
    entities: tuple[EntityId, ...]
    handover: PartialHandover | None = None

    @field_validator("entities")
    @classmethod
    def unique_sorted(cls, value):
        if not value:
            raise ValueError("A target group cannot be empty")
        return tuple(sorted(set(value)))


class PartialWindowDefaults(Model):
    on_duration: DurationRange | None = None
    min_gap: Duration | None = None
    overlap: bool | None = None
    target_mode: TargetMode | None = None


class WindowDefaults(Model):
    on_duration: DurationRange = Field(default_factory=lambda: DurationRange(min="5m", max="2h30m"))
    min_gap: Duration = "0s"
    overlap: bool = False
    target_mode: TargetMode = "all"


class PartialActivityDefaults(Model):
    duration: DurationRange | None = None
    stop_behavior: Literal["end_if_owned", "leave_running"] | None = None


class ActivityDefaults(Model):
    duration: DurationRange | None = None
    stop_behavior: Literal["end_if_owned", "leave_running"] = "end_if_owned"


class PartialDefaults(Model):
    time_distribution: Distribution | None = None
    probability: Probability | None = None
    target_order: Literal["ordered", "shuffled"] | None = None
    stagger: DurationRange | None = None
    activity_windows: PartialWindowDefaults | None = None
    activities: PartialActivityDefaults | None = None


class Defaults(Model):
    time_distribution: Distribution = "uniform"
    probability: Probability = 1
    target_order: Literal["ordered", "shuffled"] = "ordered"
    stagger: DurationRange = Field(default_factory=lambda: DurationRange(fixed="0s"))
    activity_windows: WindowDefaults = Field(default_factory=WindowDefaults)
    activities: ActivityDefaults = Field(default_factory=ActivityDefaults)
    handover: Handover = Field(default_factory=Handover)


class Item(Model):
    id: Identifier
    name: str
    description: str | None = None
    days: tuple[Day, ...] | None = None
    probability: Probability | None = None
    time_distribution: Distribution | None = None
    missing_anchor: Literal["error", "skip"] = "error"
    allow_cross_boundary: bool = False


class Step(Item):
    when: When
    actions: tuple[Action, ...]


class Activity(Item):
    when: When
    duration: DurationRange | None = None
    resources: tuple[EntityId, ...]
    on_start: tuple[Action, ...]
    on_end: tuple[Action, ...]
    start_conditions: tuple[Condition, ...] = ()
    ownership_conditions: tuple[Condition, ...] = ()
    stop_behavior: Literal["end_if_owned", "leave_running"] | None = None
    within: Between | None = None


class ActivityWindow(Item):
    between: Between
    cycles: CountRange
    targets: Targets = Field(default_factory=Targets)
    on_start: tuple[Action, ...] = ()
    on_end: tuple[Action, ...] = ()
    on_duration: DurationRange | None = None
    min_gap: Duration | None = None
    overlap: bool | None = None
    target_mode: TargetMode | None = None
    subset_size: CountRange | None = None
    weights: dict[EntityId, Annotated[float, Field(gt=0, allow_inf_nan=False)]] = Field(
        default_factory=dict
    )
    max_simultaneous: Annotated[int, Field(gt=0, le=1000, strict=True)] | None = None
    data: dict[str, JsonValue] = Field(default_factory=dict)


class Routine(Model):
    id: Identifier
    name: str
    description: str | None = None
    days: tuple[Day, ...] = WEEKDAYS
    probability: Probability = 1
    defaults: PartialDefaults = Field(default_factory=PartialDefaults)
    steps: tuple[Step, ...] = ()
    activities: tuple[Activity, ...] = ()
    activity_windows: tuple[ActivityWindow, ...] = ()


class Baseline(Model):
    targets: Targets
    state: Literal["on", "off"]
    brightness_pct: Annotated[float, Field(gt=0, le=100)] | None = None
    color_temp_kelvin: Annotated[int, Field(gt=0, strict=True)] | None = None
    hs_color: tuple[float, float] | None = None
    rgb_color: tuple[int, int, int] | None = None


class Lighting(Model):
    managed_targets: Targets = Field(default_factory=Targets)
    default_brightness_pct: Annotated[float, Field(gt=0, le=100)] = 70
    baseline: tuple[Baseline, ...] = ()
    handover: PartialHandover = Field(default_factory=PartialHandover)


class Policies(Model):
    late_start: Literal["future_only"] = "future_only"
    lighting_stop_behavior: Literal["leave_states", "turn_off_owned"] = "leave_states"
    manual_override: Literal["yield_entity_until_next_activation", "authoritative_simulation"] = (
        "yield_entity_until_next_activation"
    )


class Constraints(Model):
    max_simultaneous_groups: Annotated[int, Field(gt=0, le=1000, strict=True)] | None = None
    generation_attempts: Annotated[int, Field(ge=1, le=256, strict=True)] = 64


class Location(Model):
    latitude: Annotated[float, Field(ge=-90, le=90, allow_inf_nan=False)]
    longitude: Annotated[float, Field(ge=-180, le=180, allow_inf_nan=False)]
    elevation: Annotated[float, Field(allow_inf_nan=False)] = 0


class Program(Model):
    schema_version: Literal[1]
    name: str
    description: str | None = None
    timezone: str = "home_assistant"
    location: Location | None = None
    day_boundary: Clock = "02:00"
    activation: Activation = Field(default_factory=Activation)
    policies: Policies = Field(default_factory=Policies)
    defaults: Defaults = Field(default_factory=Defaults)
    lighting: Lighting = Field(default_factory=Lighting)
    constraints: Constraints = Field(default_factory=Constraints)
    groups: tuple[Group, ...] = ()
    routines: tuple[Routine, ...] = ()

    @field_validator("schema_version", mode="before")
    @classmethod
    def exact_version(cls, value):
        if type(value) is not int or value != 1:
            raise ValueError("schema_version must be the integer 1")
        return value

    @field_validator("timezone")
    @classmethod
    def known_timezone(cls, value):
        if value != "home_assistant":
            try:
                ZoneInfo(value)
            except (ZoneInfoNotFoundError, ValueError) as err:
                raise ValueError("Choose a valid IANA timezone or home_assistant") from err
        return value


def merge_defaults(program: Program, routine: Routine) -> Defaults:
    """Only the documented two-level override, without templates or executable expressions."""
    data = program.defaults.model_dump(mode="json", exclude_none=True)
    overrides = routine.defaults.model_dump(mode="json", exclude_none=True)
    for key, value in overrides.items():
        if isinstance(value, dict) and key in {"activity_windows", "activities"}:
            data[key].update(value)
        else:
            data[key] = value
    return Defaults.model_validate(data)


def effective_days(routine: Routine, item: Item) -> tuple[Day, ...]:
    chosen = set(routine.days) if item.days is None else set(routine.days) & set(item.days)
    return tuple(day for day in WEEKDAYS if day in chosen)


def effective_handover(program: Program, group: Group | None = None) -> Handover:
    data = program.defaults.handover.model_dump(mode="json", exclude_none=True)
    data.update(program.lighting.handover.model_dump(mode="json", exclude_none=True))
    if group is not None and group.handover is not None:
        data.update(group.handover.model_dump(mode="json", exclude_none=True))
    return Handover.model_validate(data)
