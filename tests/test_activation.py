"""Native state-list membership and conservative dependency handling."""

import pytest
import voluptuous as vol

from custom_components.occupied.activation import ActivationGate


async def test_boolean_conditions_and_attribute_membership(hass):
    gate = ActivationGate(
        hass,
        [
            {
                "condition": "or",
                "conditions": [
                    {
                        "condition": "state",
                        "entity_id": "sensor.alarm",
                        "state": ["armed", "armed_away"],
                    },
                    {
                        "condition": "state",
                        "entity_id": "remote.harmony",
                        "attribute": "current_activity",
                        "state": ["Watch TV", "Play Game"],
                    },
                ],
            }
        ],
    )
    await gate.async_prepare()
    hass.states.async_set("sensor.alarm", "disarmed")
    hass.states.async_set("remote.harmony", "on", {"current_activity": "Watch TV"})
    assert gate.evaluate()[0]
    hass.states.async_set("remote.harmony", "on", {"current_activity": "PowerOff"})
    assert not gate.evaluate()[0]
    assert gate.entities == {"sensor.alarm", "remote.harmony"}


@pytest.mark.parametrize("state", [None, "unknown", "unavailable"])
async def test_unresolved_dependency_blocks_even_under_negation(hass, state):
    gate = ActivationGate(
        hass,
        [
            {
                "condition": "not",
                "conditions": [
                    {"condition": "state", "entity_id": "sensor.alarm", "state": "disarmed"}
                ],
            }
        ],
    )
    await gate.async_prepare()
    if state is not None:
        hass.states.async_set("sensor.alarm", state)
    assert not gate.evaluate()[0]
    assert "unresolved" in gate.evaluate()[1]


def test_executable_conditions_are_outside_initial_contract(hass):
    with pytest.raises(vol.Invalid):
        ActivationGate(hass, [{"condition": "template", "value_template": "{{ true }}"}])
