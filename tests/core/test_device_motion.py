"""Motion recognition stays bounded and compares the requested color mode."""

from datetime import UTC, datetime, timedelta

import pytest

from custom_components.occupied.device_motion import motion_for, progresses
from custom_components.occupied.planner import ResolvedAction


@pytest.mark.parametrize(
    "key,initial,middle,target",
    [
        ("color_temp_kelvin", 2700, 3000, 4000),
        ("hs_color", [350, 40], [0, 50], [10, 60]),
        ("rgb_color", [10, 20, 30], [20, 30, 40], [30, 40, 50]),
    ],
)
def test_color_progress_and_reversal(key, initial, middle, target):
    now = datetime(2026, 10, 13, tzinfo=UTC)
    observed = {"state": "on", "attributes": {key: initial}}
    action = ResolvedAction(
        "light.turn_on", ("light.proof",), {key: target, "transition": 30}, ("light.proof",), True
    )
    motion = motion_for(action, observed, now)
    assert progresses(motion, observed, now + timedelta(seconds=5))
    progress = {"state": "on", "attributes": {key: middle}}
    assert progresses(motion, progress, now + timedelta(seconds=10))
    assert not progresses(motion, observed, now + timedelta(seconds=11))
    assert not progresses(motion, progress, now + timedelta(seconds=31))
