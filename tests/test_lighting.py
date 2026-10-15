"""Known light projection and handover without baseline or brightness invention."""

from datetime import UTC, date, datetime

import pytest

from custom_components.occupied.actions import light_observation
from custom_components.occupied.handover import calls_for_target
from custom_components.occupied.lighting import LightState, preview_handover, project_lighting
from custom_components.occupied.models import Handover
from custom_components.occupied.planner import generate_plan
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import validate_program


@pytest.mark.parametrize("state", ["on", "off"])
@pytest.mark.parametrize("brightness", [None, 128])
async def test_light_observation_accepts_null_ha_attributes(hass, state, brightness):
    hass.states.async_set(
        "light.a",
        state,
        {"brightness": brightness, "color_temp_kelvin": None, "hs_color": None, "rgb_color": None},
    )
    expected_brightness = (
        0 if state == "off" else brightness * 100 / 255 if brightness is not None else None
    )
    assert light_observation(hass, "light.a") == LightState(state, expected_brightness)


def test_unknown_before_first_action_and_no_brightness_default(program_dict):
    program_dict["steps"]["wake"].update(action="turn_on", data={})
    program_dict["steps"]["wake"]["timing"] = {"absolute_time": {"start": "06:00"}}
    p = validate_program(program_dict)
    plan = generate_plan(p, date(2026, 10, 13), 0, context=PlanningContext("UTC"))
    assert project_lighting(p, plan, datetime(2026, 10, 13, 5, tzinfo=UTC)) == {}
    states = project_lighting(p, plan, datetime(2026, 10, 13, 6, tzinfo=UTC))
    assert states["light.a"] == LightState("on")
    assert not preview_handover(p, plan, datetime(2026, 10, 13, 5, tzinfo=UTC))["targets"]
    assert "light.a" not in project_lighting(
        p, plan, datetime(2026, 10, 13, 6, tzinfo=UTC), yielded={"light.a"}
    )


def test_unspecified_brightness_is_not_added_to_handover():
    now = datetime(2026, 10, 13, tzinfo=UTC)
    calls = calls_for_target(
        "light.a",
        LightState("off", 0),
        LightState("on"),
        now,
        now.replace(minute=10),
        Handover(),
        dimmable=True,
        native_transition=True,
    )
    assert calls[0].service == "turn_on" and calls[0].data == {"transition": 600}


def test_bounded_fallback_and_off_handover():
    now = datetime(2026, 10, 13, tzinfo=UTC)
    calls = calls_for_target(
        "light.a",
        LightState("on", 50),
        LightState("off", 0),
        now,
        now.replace(minute=10),
        Handover(),
        dimmable=True,
        native_transition=False,
    )
    assert len(calls) == 20 and calls[-1].service == "turn_off"


def test_opaque_target_invalidates_known_state(program_dict):
    program_dict["steps"]["opaque"] = {
        "timing": {"absolute_time": {"start": "08:00"}},
        "action": "script.turn_on",
        "entities": ["light.a"],
    }
    p = validate_program(program_dict)
    plan = generate_plan(p, date(2026, 10, 13), 0, context=PlanningContext("UTC"))
    assert "light.a" not in project_lighting(p, plan, datetime(2026, 10, 13, 9, tzinfo=UTC))


def test_unspecified_non_dimmable_on_uses_stable_stagger():
    now = datetime(2026, 10, 13, tzinfo=UTC)
    deadline = now.replace(minute=10)
    calls = calls_for_target(
        "light.a",
        LightState("off", 0),
        LightState("on"),
        now,
        deadline,
        Handover(),
        dimmable=False,
        native_transition=False,
    )
    assert now.replace(minute=5) <= calls[0].at < deadline
    assert calls[0].data == {}
    assert calls == calls_for_target(
        "light.a",
        LightState("off", 0),
        LightState("on"),
        now,
        deadline,
        Handover(),
        dimmable=False,
        native_transition=False,
    )
