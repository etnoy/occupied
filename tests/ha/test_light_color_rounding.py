"""Equivalent HA color reports do not trigger another state-enforcement call."""

import pytest

from custom_components.occupied.actions import light_matches
from custom_components.occupied.lighting import LightState


@pytest.mark.parametrize(
    "key,target,actual,matches",
    [
        ("color_temp_kelvin", 2700, 2702, True),
        ("color_temp_kelvin", 2700, 2673, True),
        ("color_temp_kelvin", 2700, 2727, True),
        ("color_temp_kelvin", 2700, 2728, False),
        ("color_temp_kelvin", 2700, None, False),
        ("hs_color", (359, 50), (0, 50), True),
        ("hs_color", (0, 50), (359, 50), True),
        ("hs_color", (120, 50), (120.5, 50.5), True),
        ("hs_color", (120, 50), (120, 51), True),
        ("hs_color", (120, 50), (122, 50), False),
        ("hs_color", (120, 50), (120, 51.1), False),
        ("hs_color", (120, 50), None, False),
        ("rgb_color", (20, 30, 40), (20, 30, 40), True),
        ("rgb_color", (20, 30, 40), (21, 29, 41), True),
        ("rgb_color", (20, 30, 40), (22, 30, 40), False),
    ],
)
async def test_light_color_reports_match_within_tolerance(hass, key, target, actual, matches):
    hass.states.async_set(
        "light.proof", "on", {key: actual, "supported_color_modes": ["color_temp", "hs", "rgb"]}
    )
    assert light_matches(hass, "light.proof", LightState("on", **{key: target})) is matches
