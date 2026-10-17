"""Pure shared program fixtures; HA plugin is optional for standalone core tests."""

from importlib.util import find_spec

import pytest

pytest_plugins = ["pytest_homeassistant_custom_component"] if find_spec("homeassistant") else []


@pytest.fixture
def program_dict():
    """Canonical GUI-editable steps with a typed dependency."""
    return {
        "schema_version": 1,
        "name": "House",
        "steps": {
            "wake": {
                "name": "Wake",
                "timing": {"absolute_time": {"start": "06:40", "end": "07:20"}},
                "action": "light.turn_on",
                "entities": ["light.a", "light.b"],
                "data": {"brightness_pct": 60},
            },
            "leave": {
                "name": "Leave",
                "timing": {
                    "relative_to": {"step": "wake", "start_offset": "30m", "end_offset": "45m"}
                },
                "action": "turn_off",
                "entities": ["light.a", "light.b"],
            },
        },
    }
