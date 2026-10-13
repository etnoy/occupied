"""Versioned, serializable behavior model with no Home Assistant API dependency."""

import json
import math
import re
from decimal import Decimal
from typing import Annotated, Any, Literal

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
Identifier = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_-]*$")]
EntityId = Annotated[str, StringConstraints(pattern=r"^[a-z_][a-z0-9_]*\.[a-z0-9_]+$")]
Clock = Annotated[str, StringConstraints(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$")]


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


SignedDuration = Annotated[
    float,
    BeforeValidator(parse_duration, json_schema_input_type=str),
    PlainSerializer(format_duration),
]
Duration = Annotated[SignedDuration, Field(ge=0)]
PositiveDuration = Annotated[SignedDuration, Field(gt=0)]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, validate_default=True)


def normalize_clock(value: str) -> str:
    return value[:-3] if value.endswith(":00") and len(value) == 8 else value


class AbsoluteTime(Model):
    start: Clock
    end: Clock | None = None

    @field_validator("start", "end")
    @classmethod
    def compact_clock(cls, value):
        return normalize_clock(value) if value is not None else None

    @model_validator(mode="after")
    def fixed_time(self):
        if self.end == self.start:
            object.__setattr__(self, "end", None)
        return self


SolarEvent = Literal["sunrise", "sunset", "dawn", "dusk", "noon", "midnight"]


class RelativeTo(Model):
    model_config = ConfigDict(
        json_schema_extra={
            "oneOf": [
                {
                    "required": ["step"],
                    "properties": {"step": {"not": {"type": "null"}}},
                    "not": {"anyOf": [{"required": ["sun"]}, {"required": ["entity"]}]},
                },
                {
                    "required": ["sun"],
                    "properties": {"sun": {"not": {"type": "null"}}},
                    "not": {"anyOf": [{"required": ["step"]}, {"required": ["entity"]}]},
                },
                {
                    "required": ["entity"],
                    "properties": {"entity": {"not": {"type": "null"}}},
                    "not": {"anyOf": [{"required": ["step"]}, {"required": ["sun"]}]},
                },
            ]
        }
    )
    step: Identifier | None = None
    sun: SolarEvent | None = None
    entity: EntityId | None = None
    attribute: Literal["start_time", "end_time"] | None = None
    start_offset: SignedDuration = "0s"
    end_offset: SignedDuration | None = None

    @model_validator(mode="after")
    def valid_source(self):
        if (
            len({"step", "sun", "entity"} & self.model_fields_set) != 1
            or sum(value is not None for value in (self.step, self.sun, self.entity)) != 1
        ):
            raise ValueError("Choose exactly one step, sun, or entity source")
        if self.attribute is not None and (
            not self.entity or not self.entity.startswith("calendar.")
        ):
            raise ValueError("Calendar attributes require a calendar entity source")
        if self.entity and self.entity.startswith("calendar.") and self.attribute is None:
            raise ValueError("Choose the calendar start_time or end_time")
        if self.entity and not self.entity.startswith(("sensor.", "input_datetime.", "calendar.")):
            raise ValueError("Choose a time helper, timestamp sensor, or calendar")
        if self.end_offset is not None:
            if self.end_offset < self.start_offset:
                raise ValueError("End offset must be at least the start offset")
            if self.end_offset == self.start_offset:
                object.__setattr__(self, "end_offset", None)
        return self

    @property
    def latest_offset(self):
        return self.start_offset if self.end_offset is None else self.end_offset


class Timing(Model):
    model_config = ConfigDict(
        json_schema_extra={
            "oneOf": [
                {
                    "required": ["absolute_time"],
                    "properties": {"absolute_time": {"not": {"type": "null"}}},
                    "not": {"anyOf": [{"required": ["relative_to"]}]},
                },
                {
                    "required": ["relative_to"],
                    "properties": {"relative_to": {"not": {"type": "null"}}},
                    "not": {"anyOf": [{"required": ["absolute_time"]}]},
                },
            ]
        }
    )
    absolute_time: AbsoluteTime | None = None
    relative_to: RelativeTo | None = None

    @model_validator(mode="after")
    def one_mode(self):
        if len({"absolute_time", "relative_to"} & self.model_fields_set) != 1 or (
            self.absolute_time is None
        ) == (self.relative_to is None):
            raise ValueError("Choose absolute_time or relative_to")
        return self


class Schedule(Model):
    name: str | None = None
    enabled: Annotated[bool, Field(strict=True)] = True
    days: Annotated[tuple[Day, ...], Field(min_length=1)] = WEEKDAYS

    @field_validator("name")
    @classmethod
    def optional_title(cls, value):
        return value.strip() or None if value is not None else None

    @field_validator("days")
    @classmethod
    def canonical_days(cls, value):
        return tuple(day for day in WEEKDAYS if day in value)


class Action(Model):
    action: Annotated[
        str, StringConstraints(pattern=r"^(?:turn_on|turn_off|[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)$")
    ]
    entities: Annotated[tuple[EntityId, ...], Field(min_length=1)]
    data: dict[str, JsonValue] = Field(default_factory=dict)

    @field_validator("data")
    @classmethod
    def finite_json(cls, value):
        json.dumps(value, allow_nan=False)
        return value

    @field_validator("entities")
    @classmethod
    def unique_entities(cls, value):
        return tuple(sorted(set(value)))


class Step(Schedule, Action):
    timing: Timing


class RandomEvent(Schedule):
    start: Timing
    end: Timing
    min_duration: PositiveDuration = "5m"
    max_duration: PositiveDuration = "15m"
    count: Annotated[int, Field(strict=True, ge=1, le=1000)] = 3
    on: Action
    off: Action

    @field_validator("max_duration")
    @classmethod
    def ordered_durations(cls, value, info):
        if value < info.data.get("min_duration", 0):
            raise ValueError("Maximum duration must be at least the minimum duration")
        return value


class Program(Model):
    schema_version: Literal[1]
    name: str
    steps: dict[Identifier, Step] = Field(default_factory=dict)
    random: dict[Identifier, RandomEvent] = Field(default_factory=dict)

    @field_validator("schema_version", mode="before")
    @classmethod
    def exact_version(cls, value):
        if type(value) is not int or value != 1:
            raise ValueError("schema_version must be the integer 1")
        return value


class Handover(Model):
    """Internal runtime defaults, never serialized into user configuration."""

    duration: Duration = "10m"
    dimming: Literal["auto", "stepped_only"] = "auto"
    step_interval: PositiveDuration = "30s"


def controlled_entities(program: Program) -> frozenset[str]:
    return frozenset(entity for _, action in program_actions(program) for entity in action.entities)


def projectable_lights(program: Program) -> frozenset[str]:
    return frozenset(
        entity
        for _, action in program_actions(program)
        if action.action in {"turn_on", "turn_off", "light.turn_on", "light.turn_off"}
        for entity in action.entities
        if entity.startswith("light.")
    )


def program_actions(program: Program, *, enabled_only=True):
    """Visit every configured action with its editor path."""
    for key, step in program.steps.items():
        if step.enabled or not enabled_only:
            yield ("steps", key), step
    for key, event in program.random.items():
        if event.enabled or not enabled_only:
            yield ("random", key, "on"), event.on
            yield ("random", key, "off"), event.off


def program_timings(program: Program, *, enabled_only=True):
    for key, step in program.steps.items():
        if step.enabled or not enabled_only:
            yield ("steps", key, "timing"), step.timing
    for key, event in program.random.items():
        if event.enabled or not enabled_only:
            yield ("random", key, "start"), event.start
            yield ("random", key, "end"), event.end


def max_plan_events(program: Program) -> int:
    return sum(len(step.entities) for step in program.steps.values() if step.enabled) + sum(
        event.count * (len(event.on.entities) + len(event.off.entities))
        for event in program.random.values()
        if event.enabled
    )
