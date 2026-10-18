"""Solar anchors follow the requested local date on either side of the date line."""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest

from custom_components.occupied.models import RelativeTo
from custom_components.occupied.time_utils import PlanningContext, SimulationDay
from custom_components.occupied.validation import validate_program


@pytest.mark.parametrize(
    "zone,latitude,longitude",
    [
        ("Pacific/Apia", -13.83, -171.75),
        ("Pacific/Tongatapu", -21.14, -175.2),
        ("Pacific/Kiritimati", 1.87, -157.43),
        ("Pacific/Chatham", -43.95, -176.56),
        ("Pacific/Auckland", -36.85, 174.76),
        ("America/Los_Angeles", 34.05, -118.24),
        ("Europe/Stockholm", 59.3, 18.1),
        ("Asia/Tokyo", 35.68, 139.69),
    ],
)
def test_solar_anchors_stay_on_the_local_schedule_date(zone, latitude, longitude):
    program = validate_program({"schema_version": 1, "name": "Solar"})
    for month in range(1, 13):
        day = date(2026, month, 15)
        context = PlanningContext(zone, latitude, longitude)
        for sun in ("sunrise", "sunset", "dawn", "dusk", "noon", "midnight"):
            issues = []
            simulation = SimulationDay(program, day, context, issues)
            bounds = simulation.sun_bounds(RelativeTo(sun=sun), ("solar",))
            if bounds is None:
                assert sun in {"dawn", "dusk"} and any(
                    issue.code == "sun_unavailable" for issue in issues
                )
                continue
            anchor = bounds[0].astimezone(ZoneInfo(zone))
            if sun == "midnight":
                # Astral defines solar midnight as the occurrence nearest 00:00,
                # which can be shortly before the start of the civil date.
                assert abs(anchor - datetime.combine(day, time(), ZoneInfo(zone))) < timedelta(
                    hours=3
                )
            else:
                assert anchor.date() == day, (zone, day, sun, anchor)
