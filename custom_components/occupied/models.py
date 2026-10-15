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
    TypeAdapter,
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
                    "not": {
                        "anyOf": [
                            {"required": ["sun"]},
                            {"required": ["entity"]},
                            {"required": ["random"]},
                        ]
                    },
                },
                {
                    "required": ["sun"],
                    "properties": {"sun": {"not": {"type": "null"}}},
                    "not": {
                        "anyOf": [
                            {"required": ["step"]},
                            {"required": ["entity"]},
                            {"required": ["random"]},
                        ]
                    },
                },
                {
                    "required": ["entity"],
                    "properties": {"entity": {"not": {"type": "null"}}},
                    "not": {
                        "anyOf": [
                            {"required": ["step"]},
                            {"required": ["sun"]},
                            {"required": ["random"]},
                        ]
                    },
                },
                {
                    "required": ["random"],
                    "properties": {"random": {"not": {"type": "null"}}},
                    "not": {
                        "anyOf": [
                            {"required": ["step"]},
                            {"required": ["sun"]},
                            {"required": ["entity"]},
                        ]
                    },
                },
            ]
        }
    )
    step: Identifier | None = None
    random: Identifier | None = None
    sun: SolarEvent | None = None
    entity: EntityId | None = None
    attribute: Literal["start_time", "end_time"] | None = None
    start_offset: SignedDuration = "0s"
    end_offset: SignedDuration | None = None

    @model_validator(mode="after")
    def valid_source(self):
        if (
            len({"step", "random", "sun", "entity"} & self.model_fields_set) != 1
            or sum(value is not None for value in (self.step, self.random, self.sun, self.entity))
            != 1
        ):
            raise ValueError("Choose exactly one step, random event, sun, or entity source")
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


class WindowDuration(Model):
    min: PositiveDuration
    max: PositiveDuration | None = None

    @field_validator("max")
    @classmethod
    def ordered_durations(cls, value, info):
        if value is not None and (minimum := info.data.get("min")) is not None:
            if value < minimum:
                raise ValueError("Maximum window duration must be at least the minimum")
            if value == minimum:
                return None
        return value

    @property
    def latest_duration(self):
        return self.min if self.max is None else self.max


class Timing(Model):
    model_config = ConfigDict(
        json_schema_extra={
            "oneOf": [
                {
                    "required": ["absolute_time"],
                    "properties": {"absolute_time": {"not": {"type": "null"}}},
                    "not": {"anyOf": [{"required": ["relative_to"]}, {"required": ["duration"]}]},
                },
                {
                    "required": ["relative_to"],
                    "properties": {"relative_to": {"not": {"type": "null"}}},
                    "not": {"anyOf": [{"required": ["absolute_time"]}, {"required": ["duration"]}]},
                },
                {
                    "required": ["duration"],
                    "properties": {"duration": {"not": {"type": "null"}}},
                    "not": {
                        "anyOf": [{"required": ["absolute_time"]}, {"required": ["relative_to"]}]
                    },
                },
            ]
        }
    )
    absolute_time: AbsoluteTime | None = None
    relative_to: RelativeTo | None = None
    duration: WindowDuration | None = None

    @model_validator(mode="after")
    def one_mode(self):
        if (
            len({"absolute_time", "relative_to", "duration"} & self.model_fields_set) != 1
            or sum(
                value is not None for value in (self.absolute_time, self.relative_to, self.duration)
            )
            != 1
        ):
            raise ValueError("Choose absolute_time, relative_to, or duration")
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


class BoundaryClock(Model):
    start: Clock

    _compact_clock = field_validator("start")(normalize_clock)


class BoundarySolar(Model):
    sun: SolarEvent
    start_offset: SignedDuration = "0s"

    @property
    def latest_offset(self):
        return self.start_offset


class TimingBoundary(Model):
    """A single source-date instant, without ranges, references or modifiers."""

    model_config = ConfigDict(
        json_schema_extra={
            "oneOf": [
                {"required": ["absolute_time"], "not": {"required": ["relative_to"]}},
                {"required": ["relative_to"], "not": {"required": ["absolute_time"]}},
            ]
        }
    )
    absolute_time: BoundaryClock | None = Field(
        default=None, json_schema_extra={"not": {"type": "null"}}
    )
    relative_to: BoundarySolar | None = Field(
        default=None, json_schema_extra={"not": {"type": "null"}}
    )

    @model_validator(mode="before")
    @classmethod
    def fixed_source(cls, value):
        if isinstance(value, dict) and (
            len(value) != 1 or next(iter(value.values()), None) is None
        ):
            raise ValueError("Choose exactly one fixed clock or solar boundary")
        return value


class StepTiming(Timing):
    latest_at: TimingBoundary | None = Field(
        default=None, validate_default=False, json_schema_extra={"not": {"type": "null"}}
    )
    only_before: TimingBoundary | None = Field(
        default=None, validate_default=False, json_schema_extra={"not": {"type": "null"}}
    )

    @field_validator("latest_at", "only_before", mode="before")
    @classmethod
    def nonnull_boundary(cls, value):
        if value is None:
            raise ValueError("Omit an unused timing modifier instead of using null")
        return value


class Stagger(Model):
    enabled: Annotated[bool, Field(strict=True)] = False
    period: Annotated[SignedDuration, Field(ge=1, le=1800)] = "2m"


class Action(Model):
    model_config = ConfigDict(
        json_schema_extra={
            "oneOf": [
                {"required": ["action", "entities"], "not": {"required": ["actions"]}},
                {
                    "required": ["actions"],
                    "not": {
                        "anyOf": [
                            {"required": ["action"]},
                            {"required": ["entities"]},
                            {"required": ["data"]},
                            {"required": ["stagger"]},
                        ]
                    },
                },
            ],
        }
    )
    action: (
        Annotated[
            str,
            StringConstraints(
                pattern=r"^(?:set_state|turn_on|turn_off|[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)$"
            ),
        ]
        | None
    ) = None
    entities: tuple[EntityId, ...] | dict[EntityId, dict[str, JsonValue]] = ()
    data: dict[str, JsonValue] = Field(default_factory=dict)
    stagger: Stagger = Field(default_factory=Stagger)
    actions: Annotated[tuple[Action, ...], Field(min_length=1, max_length=100)] | None = None

    @field_validator("data", "entities")
    @classmethod
    def finite_json(cls, value):
        json.dumps(value, allow_nan=False)
        return value

    @field_validator("entities")
    @classmethod
    def unique_entities(cls, value):
        return dict(sorted(value.items())) if isinstance(value, dict) else tuple(sorted(set(value)))

    @model_validator(mode="after")
    def action_shape(self):
        if self.actions is not None:
            if {"action", "entities", "data", "stagger"} & self.model_fields_set:
                raise ValueError("Use actions or action/entities/data, never both")
            if sum(len(item.entities) for item in self.actions) > 1000:
                raise ValueError("Custom blocks support at most 1000 resolved calls")
            if any(item.actions is not None for item in self.actions):
                raise ValueError("Nested action lists are not supported")
            if self.stagger_span > 1800:
                raise ValueError("Combined stagger periods must be no greater than 30m")
        else:
            if isinstance(self.entities, dict) and len(self.entities) > 1000:
                raise ValueError("State mappings support at most 1000 entities")
            if self.action is None or not self.entities:
                raise ValueError("An action requires an action name and nonempty entities")
            if (self.action == "set_state") != isinstance(self.entities, dict):
                raise ValueError(
                    "set_state requires an entity mapping; other actions require a list"
                )
        return self

    def configured_actions(self):
        return self.actions if self.actions is not None else (self,)

    @property
    def stagger_span(self):
        return sum(a.stagger.period for a in self.configured_actions() if a.stagger.enabled)

    @property
    def target_ids(self):
        return tuple(
            dict.fromkeys(
                entity for action in self.configured_actions() for entity in action.entities
            )
        )


class Step(Schedule, Action):
    timing: StepTiming


EventCount = Annotated[int, Field(strict=True, ge=0, le=1000)]
EVENT_COUNT_ADAPTER = TypeAdapter(EventCount)


class CountRange(Model):
    min: EventCount
    max: EventCount

    @field_validator("max")
    @classmethod
    def ordered_counts(cls, value, info):
        if value < info.data.get("min", 0):
            raise ValueError("Maximum times per window must be at least the minimum")
        return value


class RandomEvent(Schedule):
    start: Timing
    end: Timing
    min_duration: PositiveDuration = "5m"
    max_duration: PositiveDuration = "15m"
    count: EventCount | CountRange = 3
    on: Action
    off: Action

    @field_validator("count", mode="before")
    @classmethod
    def validate_count(cls, value):
        # Validate the selected shape first so errors point to editable fields,
        # rather than exposing the internal union branch names.
        if isinstance(value, (dict, CountRange)):
            bounds = CountRange.model_validate(value)
            return bounds.min if bounds.min == bounds.max else bounds
        return EVENT_COUNT_ADAPTER.validate_python(value)

    @property
    def min_count(self):
        return self.count.min if isinstance(self.count, CountRange) else self.count

    @property
    def max_count(self):
        return self.count.max if isinstance(self.count, CountRange) else self.count

    @field_validator("max_duration")
    @classmethod
    def ordered_durations(cls, value, info):
        if value < info.data.get("min_duration", 0):
            raise ValueError("Maximum duration must be at least the minimum duration")
        return value


class RunCondition(Model):
    """Optional execution policy, independent of schedule sampling."""

    entity_id: EntityId
    state: list[Annotated[str, StringConstraints(min_length=1)]] = Field(min_length=1)
    enforce_state_on_start: Annotated[bool, Field(strict=True)] = False
    start_delay: Annotated[Duration, Field(le=3600)] = "30s"

    @field_validator("state", mode="before", json_schema_input_type=str | list[str])
    @classmethod
    def state_list(cls, value):
        return [value] if isinstance(value, str) else value

    @field_validator("state")
    @classmethod
    def resolved_states(cls, value):
        if any(not state.strip() or state in {"unknown", "unavailable"} for state in value):
            raise ValueError("Choose nonempty resolved entity states")
        return list(dict.fromkeys(value))


class Program(Model):
    schema_version: Literal[1]
    name: str
    run_condition: RunCondition | None = None
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
        if action.action in {"set_state", "turn_on", "turn_off", "light.turn_on", "light.turn_off"}
        for entity in action.entities
        if entity.startswith("light.")
    )


def program_actions(program: Program, *, enabled_only=True):
    """Visit every configured action with its editor path."""
    for key, step in program.steps.items():
        if step.enabled or not enabled_only:
            for index, action in enumerate(step.configured_actions()):
                yield (("steps", key, "actions", index) if step.actions else ("steps", key)), action
    for key, event in program.random.items():
        if event.enabled or not enabled_only:
            for phase in ("on", "off"):
                block = getattr(event, phase)
                for index, action in enumerate(block.configured_actions()):
                    path = ("random", key, phase)
                    yield (path + ("actions", index) if block.actions else path), action


def program_timings(program: Program, *, enabled_only=True):
    for key, step in program.steps.items():
        if step.enabled or not enabled_only:
            yield ("steps", key, "timing"), step.timing
    for key, event in program.random.items():
        if event.enabled or not enabled_only:
            yield ("random", key, "start"), event.start
            yield ("random", key, "end"), event.end


def max_plan_events(program: Program) -> int:
    return sum(
        sum(len(a.entities) for a in step.configured_actions())
        for step in program.steps.values()
        if step.enabled
    ) + sum(
        event.max_count
        * (
            sum(len(a.entities) for a in event.on.configured_actions())
            + sum(len(a.entities) for a in event.off.configured_actions())
        )
        for event in program.random.values()
        if event.enabled
    )
