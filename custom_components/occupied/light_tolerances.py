"""Device reporting tolerances shared by target matching and native motion."""

import math


def component_tolerance(attribute, target):
    if attribute == "color_temp_kelvin":
        return abs(target) * 0.01
    if attribute == "brightness_pct":
        return 100 / 255
    return 1 if attribute in {"brightness", "hs_color", "rgb_color"} else 0


def attribute_matches(attribute, actual, target):
    if isinstance(target, (list, tuple)):
        if not isinstance(actual, (list, tuple)) or len(actual) != len(target):
            return False
        values = zip(actual, target, strict=True)
    else:
        values = [(actual, target)]
    for index, (value, expected) in enumerate(values):
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (value, expected)):
            return False
        difference = value - expected
        if attribute == "hs_color" and index == 0:
            difference = (difference + 180) % 360 - 180
        if abs(difference) > component_tolerance(attribute, expected):
            return False
    return True
