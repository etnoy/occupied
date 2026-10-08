"""Pure timezone/sun resolution for one local simulation date."""

from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from astral import Observer
from astral.sun import dawn, dusk, midnight, noon, sunrise, sunset

from .models import Anchor, Between, ClockRange, EntityRange, Program, SunRange
from .validation import Issue, ModelPath, ProgramError


@dataclass(frozen=True)
class PlanningContext:
    timezone: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    elevation: float = 0
    time_sources: dict[str, dict[str, str | None]] = field(default_factory=dict)


def resolve_local(naive: datetime, zone: ZoneInfo) -> tuple[datetime, str | None]:
    """First occurrence of a repeated time; first valid instant following a gap."""

    def candidates(value):
        return sorted(
            {
                aware.astimezone(UTC)
                for fold in (0, 1)
                if (aware := value.replace(tzinfo=zone, fold=fold))
                .astimezone(UTC)
                .astimezone(zone)
                .replace(tzinfo=None)
                == value
            }
        )

    if choices := candidates(naive):
        return choices[0], "dst_repeat" if len(choices) > 1 else None
    probe = naive
    for _ in range(48 * 60):
        probe += timedelta(minutes=1)
        if candidates(probe):
            # Minute-sized search also covers historical timezone jumps of a
            # whole day; refine to the exact second where civil time resumes.
            while candidates(probe - timedelta(seconds=1)):
                probe -= timedelta(seconds=1)
            return candidates(probe)[0], "dst_gap"
    raise ProgramError([Issue("timezone_gap", "No valid local instant found within 48 hours")])


class SimulationDay:
    def __init__(
        self, program: Program, simulation_date: date, context: PlanningContext, issues: list[Issue]
    ):
        self.context = context
        self.program = program
        self.date = simulation_date
        self.issues = issues
        timezone = program.timezone if program.timezone != "home_assistant" else context.timezone
        if timezone is None:
            raise ProgramError(
                [
                    Issue(
                        "timezone_context",
                        "home_assistant timezone requires HA context or CLI --timezone",
                        ("timezone",),
                    )
                ]
            )
        try:
            self.zone = ZoneInfo(timezone)
        except (ValueError, KeyError) as err:
            raise ProgramError(
                [Issue("timezone_context", f"Unknown timezone {timezone}", ("timezone",))]
            ) from err
        self.boundary = time.fromisoformat(program.day_boundary)
        self.start = self._local(
            datetime.combine(simulation_date, self.boundary), ("day_boundary",)
        )
        self.end = self._local(
            datetime.combine(simulation_date + timedelta(days=1), self.boundary), ("day_boundary",)
        )
        location = program.location
        latitude = location.latitude if location else context.latitude
        longitude = location.longitude if location else context.longitude
        elevation = location.elevation if location else context.elevation
        if (latitude is None) != (longitude is None):
            raise ProgramError(
                [Issue("location_context", "Supply latitude and longitude together", ("location",))]
            )
        if latitude is not None and (not -90 <= latitude <= 90 or not -180 <= longitude <= 180):
            raise ProgramError(
                [
                    Issue(
                        "location_context",
                        "Latitude/longitude are outside their valid ranges",
                        ("location",),
                    )
                ]
            )
        self.observer = Observer(latitude, longitude, elevation) if latitude is not None else None
        self._sun_cache: dict[tuple[str, date], datetime | None] = {}

    def _local(self, value: datetime, path: ModelPath, zone: ZoneInfo | None = None) -> datetime:
        zone = zone or self.zone
        instant, adjustment = resolve_local(value, zone)
        if adjustment:
            self.issues.append(
                Issue(
                    adjustment,
                    f"{value.isoformat()} in {zone.key} resolves to "
                    f"{instant.astimezone(zone).isoformat()}; "
                    "first valid/first repeated instant policy",
                    path,
                    "info",
                )
            )
        return instant

    def clock(self, value: str, path: ModelPath, day_offset: int = 0) -> datetime:
        clock = time.fromisoformat(value)
        calendar_date = self.date + timedelta(days=day_offset + (clock < self.boundary))
        return self._local(datetime.combine(calendar_date, clock), path)

    def sun(
        self, event: str, path: ModelPath, fallback: str | None = None, day_offset: int = 0
    ) -> datetime | None:
        calendar_date = self.date + timedelta(days=day_offset)
        key = event, calendar_date
        if key not in self._sun_cache:
            try:
                function = {
                    "sunrise": sunrise,
                    "sunset": sunset,
                    "dawn": dawn,
                    "dusk": dusk,
                    "noon": noon,
                    "midnight": midnight,
                }[event]
                self._sun_cache[key] = (
                    function(self.observer, date=calendar_date, tzinfo=self.zone).astimezone(UTC)
                    if self.observer
                    else None
                )
            except ValueError:
                self._sun_cache[key] = None
        if instant := self._sun_cache[key]:
            return instant
        if fallback is not None:
            self.issues.append(
                Issue(
                    "sun_fallback",
                    f"{event} is unavailable on {calendar_date}; "
                    f"using explicit clock fallback {fallback}",
                    path,
                    "warning",
                )
            )
            return self.clock(fallback, path, day_offset)
        self.issues.append(
            Issue(
                "sun_unavailable",
                f"{event} is unavailable on {calendar_date}; affected item skipped"
                if self.observer
                else (
                    "Sun rules need a location; affected item skipped "
                    "(provide CLI --latitude/--longitude)"
                ),
                path,
                "warning",
            )
        )
        return None

    def clock_bounds(
        self, spec: ClockRange, path: ModelPath
    ) -> tuple[datetime, datetime, datetime | None]:
        if (
            time.fromisoformat(spec.latest) < time.fromisoformat(spec.earliest)
            and not spec.cross_midnight
        ):
            raise ProgramError(
                [
                    Issue(
                        "cross_midnight",
                        "A clock range crossing midnight requires cross_midnight: true",
                        path,
                    )
                ]
            )
        start = self.clock(spec.earliest, path + ("earliest",))
        end = self.clock(spec.latest, path + ("latest",))
        if end < start and spec.cross_midnight:
            end = self.clock(spec.latest, path + ("latest",), 1)
        if end < start:
            raise ProgramError(
                [
                    Issue(
                        "clock_order",
                        "Clock range ends before its start within this simulation day",
                        path,
                    )
                ]
            )
        mode = self.clock(spec.mode, path + ("mode",)) if spec.mode else None
        if mode is not None and not start <= mode <= end:
            raise ProgramError(
                [
                    Issue(
                        "clock_mode",
                        "Triangular mode is outside the resolved clock range",
                        path + ("mode",),
                    )
                ]
            )
        return start, end, mode

    def sun_bounds(
        self, spec: SunRange, path: ModelPath
    ) -> tuple[datetime, datetime, datetime | None] | None:
        anchor = self.sun(spec.sun, path, spec.fallback)
        if anchor is None:
            return None
        offsets = spec.offset_range
        return (
            anchor + timedelta(seconds=offsets.lower),
            anchor + timedelta(seconds=offsets.upper),
            anchor + timedelta(seconds=offsets.mode) if offsets.mode is not None else None,
        )

    def entity_bounds(
        self, spec: EntityRange, path: ModelPath
    ) -> tuple[datetime, datetime, datetime | None] | None:
        source = self.context.time_sources.get(spec.entity_id, {})
        value = source.get(spec.attribute or "state")
        anchor = None
        try:
            if source.get("kind") == "time" and spec.attribute is None and value:
                anchor = self.clock(value, path)
            elif value and value not in {"unknown", "unavailable"}:
                candidate = datetime.fromisoformat(value)
                # Calendar attributes can be local datetimes; timestamp sensors
                # must include a timezone, as required by Home Assistant.
                if candidate.tzinfo is None and spec.attribute:
                    candidate = self._local(
                        candidate,
                        path,
                        ZoneInfo(self.context.timezone) if self.context.timezone else self.zone,
                    )
                if candidate.tzinfo is not None:
                    candidate = candidate.astimezone(UTC)
                    if self.start <= candidate < self.end:
                        anchor = candidate
                    else:
                        self.issues.append(
                            Issue(
                                "time_source_other_date",
                                f"{spec.entity_id} has no reported occurrence on this "
                                "simulation date; item skipped",
                                path,
                                "info",
                            )
                        )
                        return None
        except ValueError, TypeError:
            pass
        if anchor is None:
            self.issues.append(
                Issue(
                    "time_source_unavailable",
                    f"{spec.entity_id} has no usable time; item skipped",
                    path,
                    "warning",
                )
            )
            return None
        offsets = spec.offset_range
        return (
            anchor + timedelta(seconds=offsets.lower),
            anchor + timedelta(seconds=offsets.upper),
            anchor + timedelta(seconds=offsets.mode) if offsets.mode is not None else None,
        )

    def anchor(
        self, spec: Anchor, steps: dict[str, datetime], path: ModelPath, extra_day: int = 0
    ) -> datetime | None:
        if spec.step is not None:
            instant = steps.get(spec.step)
            if instant is None:
                self.issues.append(
                    Issue(
                        "anchor_skipped",
                        f"Step anchor {spec.step} did not occur; dependent item skipped",
                        path,
                        "info",
                    )
                )
                return None
        elif spec.clock is not None:
            instant = self.clock(spec.clock, path, spec.day_offset + extra_day)
        else:
            instant = self.sun(spec.sun, path, spec.fallback, spec.day_offset + extra_day)
        return instant + timedelta(seconds=spec.offset) if instant is not None else None

    def between(
        self, spec: Between, steps: dict[str, datetime], path: ModelPath
    ) -> tuple[datetime, datetime] | None:
        if spec.start.clock and spec.end.clock and spec.start.day_offset == spec.end.day_offset:
            if (
                time.fromisoformat(spec.end.clock) < time.fromisoformat(spec.start.clock)
                and not spec.cross_midnight
            ):
                raise ProgramError(
                    [
                        Issue(
                            "cross_midnight",
                            "Clock window crossing midnight requires cross_midnight: true",
                            path,
                        )
                    ]
                )
        start = self.anchor(spec.start, steps, path + ("start",))
        end = self.anchor(spec.end, steps, path + ("end",))
        if start is None or end is None:
            return None
        if end <= start and spec.cross_midnight and spec.end.step is None:
            end = self.anchor(spec.end, steps, path + ("end",), 1)
        if end <= start:
            raise ProgramError(
                [
                    Issue(
                        "window_order",
                        "Window end must follow its start after timezone/DST conversion",
                        path,
                    )
                ]
            )
        return start, end

    def contains(self, start: datetime, end: datetime | None = None) -> bool:
        return self.start <= start < self.end and (end is None or end <= self.end)


def simulation_date_at(program: Program, instant: datetime, context: PlanningContext) -> date:
    if instant.tzinfo is None:
        raise ValueError("An instant must be timezone aware")
    timezone = program.timezone if program.timezone != "home_assistant" else context.timezone
    if timezone is None:
        raise ProgramError(
            [Issue("timezone_context", "home_assistant timezone requires explicit context")]
        )
    local = instant.astimezone(ZoneInfo(timezone))
    boundary, _ = resolve_local(
        datetime.combine(local.date(), time.fromisoformat(program.day_boundary)), ZoneInfo(timezone)
    )
    return local.date() - timedelta(days=instant.astimezone(UTC) < boundary)
