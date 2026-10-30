"""Timezone, solar, and known HA times for a local calendar date."""

from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from astral import Observer
from astral.sun import dawn, dusk, midnight, noon, sunrise, sunset

from .models import AbsoluteTime, BoundarySolar, Program, RelativeTo
from .validation import Issue, ModelPath, ProgramError


@dataclass(frozen=True)
class PlanningContext:
    timezone: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    elevation: float = 0
    time_sources: dict[str, dict[str, str | None]] = field(default_factory=dict)
    time_source_latches: dict[str, dict[str, dict[str, str]]] = field(default_factory=dict)
    lux_resolutions: dict[str, dict[str, str | None]] = field(default_factory=dict)


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
        self.context, self.date, self.issues = context, simulation_date, issues
        try:
            self.zone = ZoneInfo(context.timezone or "")
        except (ValueError, KeyError) as err:
            raise ProgramError(
                [
                    Issue(
                        "timezone_context", "Supply a timezone through HA context or CLI --timezone"
                    )
                ]
            ) from err
        self.start = self._local(datetime.combine(simulation_date, time()), ())
        self.end = self._local(datetime.combine(simulation_date + timedelta(days=1), time()), ())
        if (context.latitude is None) != (context.longitude is None):
            raise ProgramError(
                [Issue("location_context", "Supply latitude and longitude together")]
            )
        if context.latitude is not None and (
            not -90 <= context.latitude <= 90 or not -180 <= context.longitude <= 180
        ):
            raise ProgramError([Issue("location_context", "Invalid latitude or longitude")])
        self.observer = (
            Observer(context.latitude, context.longitude, context.elevation)
            if context.latitude is not None
            else None
        )

    def _local(self, value, path):
        instant, adjustment = resolve_local(value, self.zone)
        if adjustment:
            self.issues.append(
                Issue(adjustment, "Local time adjusted for daylight saving time", path, "warning")
            )
        return instant

    def clock(self, value, path, day_offset=0):
        return self._local(
            datetime.combine(self.date + timedelta(days=day_offset), time.fromisoformat(value)),
            path,
        )

    def clock_bounds(self, spec: AbsoluteTime, path: ModelPath):
        start = self.clock(spec.start, path + ("start",))
        value = spec.end or spec.start
        end = self.clock(
            value, path + ("end",), int(time.fromisoformat(value) < time.fromisoformat(spec.start))
        )
        return start, end

    def sun_bounds(self, spec: RelativeTo | BoundarySolar, path: ModelPath):
        if self.observer is None:
            raise ProgramError(
                [
                    Issue(
                        "location_context",
                        "Solar timing requires HA location or CLI latitude/longitude",
                        path,
                    )
                ]
            )
        # Astral's calculation date follows longitude rather than civil zone
        # offsets. Date-line zones can be a full day ahead of solar longitude.
        offset = datetime.combine(self.date, time(12), self.zone).utcoffset().total_seconds()
        solar_date = self.date - timedelta(
            days=round((offset - self.observer.longitude * 240) / 86400)
        )
        try:
            anchor = {
                "sunrise": sunrise,
                "sunset": sunset,
                "dawn": dawn,
                "dusk": dusk,
                "noon": noon,
                "midnight": midnight,
            }[spec.sun](self.observer, date=solar_date, tzinfo=self.zone).astimezone(UTC)
        except ValueError:
            self.issues.append(
                Issue(
                    "sun_unavailable",
                    f"{spec.sun} is unavailable on {self.date}; step skipped",
                    path,
                    "warning",
                )
            )
            return None
        return anchor + timedelta(seconds=spec.start_offset), anchor + timedelta(
            seconds=spec.latest_offset
        )

    def entity_bounds(self, spec: RelativeTo, path: ModelPath) -> tuple[datetime, datetime] | None:
        source = self.context.time_sources.get(
            spec.entity, {}
        ) | self.context.time_source_latches.get(self.date.isoformat(), {}).get(spec.entity, {})
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
                    )
                if candidate.tzinfo is not None:
                    candidate = candidate.astimezone(UTC)
                    if self.start <= candidate < self.end:
                        anchor = candidate
                    else:
                        self.issues.append(
                            Issue(
                                "time_source_other_date",
                                f"{spec.entity} has no reported occurrence on this "
                                "schedule date; item skipped",
                                path,
                                "info",
                            )
                        )
                        return None
        except (ValueError, TypeError):
            pass
        if anchor is None:
            self.issues.append(
                Issue(
                    "time_source_unavailable",
                    f"{spec.entity} has no usable time; item skipped",
                    path,
                    "warning",
                )
            )
            return None
        offsets = spec
        return (
            anchor + timedelta(seconds=offsets.start_offset),
            anchor + timedelta(seconds=offsets.latest_offset),
        )


def simulation_date_at(program, instant, context):
    if instant.tzinfo is None:
        raise ProgramError([Issue("naive_date", "Use a timezone-aware instant")])
    try:
        return instant.astimezone(ZoneInfo(context.timezone or "")).date()
    except (ValueError, KeyError) as err:
        raise ProgramError(
            [Issue("timezone_context", "Supply HA context or CLI --timezone")]
        ) from err
