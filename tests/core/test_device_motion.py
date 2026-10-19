"""Motion recognition stays bounded and compares the requested color mode."""

from datetime import UTC, datetime, timedelta

import pytest

from custom_components.occupied.device_motion import motion_for, progresses
from custom_components.occupied.planner import ResolvedAction


@pytest.mark.parametrize("restored_legacy_states", [False, True])
def test_turn_on_motion_never_accepts_an_off_report(restored_legacy_states):
    now = datetime(2026, 10, 13, tzinfo=UTC)
    observed = {"state": "off", "attributes": {"brightness": 0}}
    action = ResolvedAction(
        "light.turn_on",
        ("light.proof",),
        {"brightness": 100, "transition": 30},
        ("light.proof",),
        True,
    )
    motion = motion_for(action, observed, now)
    if restored_legacy_states:
        motion["states"] = ["off", "on"]
    assert not progresses(motion, observed, now + timedelta(seconds=5))


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


def test_tilt_target_preserves_the_cover_position_state():
    now = datetime(2026, 10, 13, tzinfo=UTC)
    observed = {
        "state": "closed",
        "attributes": {"current_position": 0, "current_tilt_position": 10},
    }
    action = ResolvedAction(
        "cover.set_cover_tilt_position",
        ("cover.proof",),
        {"tilt_position": 70},
        ("cover.proof",),
        True,
    )
    motion = motion_for(action, observed, now)
    assert motion["state"] == "closed"
    assert progresses(
        motion,
        {"state": "closed", "attributes": {"current_position": 0, "current_tilt_position": 70}},
        now + timedelta(seconds=20),
    )


@pytest.mark.parametrize(
    "key,target,reported",
    [
        ("brightness_pct", 33, 85),
        ("rgb_color", [30, 40, 50], [31, 39, 51]),
        ("hs_color", [0, 60], [359.5, 60.5]),
        ("color_temp_kelvin", 4000, 4035),
    ],
)
def test_light_target_rounding_is_accepted(key, target, reported):
    now = datetime(2026, 10, 13, tzinfo=UTC)
    attribute = "brightness" if key == "brightness_pct" else key
    initial = 20 if isinstance(reported, (int, float)) else [10] * len(reported)
    observed = {"state": "on", "attributes": {attribute: initial}}
    action = ResolvedAction(
        "light.turn_on", ("light.proof",), {key: target, "transition": 30}, ("light.proof",), True
    )
    motion = motion_for(action, observed, now)
    if key == "brightness_pct":
        assert motion["targets"]["brightness"] == 84
    assert progresses(
        motion, {"state": "on", "attributes": {attribute: reported}}, now + timedelta(seconds=10)
    )


def test_small_reporting_reversals_do_not_accumulate_into_manual_motion():
    now = datetime(2026, 10, 13, tzinfo=UTC)
    observed = {"state": "on", "attributes": {"brightness": 20}}
    action = ResolvedAction(
        "light.turn_on",
        ("light.proof",),
        {"brightness": 100, "transition": 30},
        ("light.proof",),
        True,
    )
    motion = motion_for(action, observed, now)
    for index, brightness in enumerate([60, 59, 58]):
        accepted = progresses(
            motion,
            {"state": "on", "attributes": {"brightness": brightness}},
            now + timedelta(seconds=index + 1),
        )
        assert accepted is (brightness >= 59)
