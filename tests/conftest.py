"""Run caller-proof tests inside real Home Assistant, with virtual device services."""

import pytest
from homeassistant.core import ServiceCall
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.occupied.const import DEFAULTS, DOMAIN

pytest_plugins = ["pytest_homeassistant_custom_component"]


@pytest.fixture(autouse=True)
def custom_integrations(enable_custom_integrations):
    """Allow HA to discover the custom integration from this repository."""


@pytest.fixture
def config():
    return DEFAULTS | {
        "light_entity": "light.proof",
        "activation_entity": "sensor.alarm",
        "remote_entity": "remote.harmony",
        "handover_seconds": 60,
        "light_delay_seconds": 10,
        "light_duration_seconds": 20,
        "remote_delay_seconds": 15,
        "remote_duration_seconds": 45,
    }


@pytest.fixture
def entry(hass, config):
    entry = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, title="House", data=config)
    entry.add_to_hass(hass)
    return entry


@pytest.fixture
def devices(hass):
    """Only the physical device integrations are mocked, via HA's service registry."""
    hass.states.async_set("sensor.alarm", "armed")
    hass.states.async_set(
        "light.proof", "on", {"brightness": 20, "supported_color_modes": ["brightness"]}
    )
    hass.states.async_set("remote.harmony", "off", {"current_activity": "PowerOff"})
    calls = []

    async def handle(call: ServiceCall):
        calls.append(call)
        entity_id = call.data["entity_id"]
        if call.domain == "light":
            attrs = dict(hass.states.get(entity_id).attributes)
            attrs.update({key: value for key, value in call.data.items() if key == "brightness"})
            hass.states.async_set(
                entity_id, "on" if call.service == "turn_on" else "off", attrs, context=call.context
            )
        else:
            hass.states.async_set(
                entity_id,
                "on" if call.service == "turn_on" else "off",
                {"current_activity": call.data.get("activity", "PowerOff")},
                context=call.context,
            )

    for domain in ("light", "remote"):
        for service in ("turn_on", "turn_off"):
            hass.services.async_register(domain, service, handle)
    return calls


@pytest.fixture
def saved_permission(hass_storage, entry):
    hass_storage[f"{DOMAIN}.{entry.entry_id}.permission"] = {
        "version": 1,
        "data": {"enabled": True, "paused": False},
    }


@pytest.fixture
def program_dict():
    """A small canonical program with every principal schedule resource."""
    return {
        "schema_version": 1,
        "name": "House",
        "timezone": "UTC",
        "groups": [{"id": "room", "name": "Room", "entities": ["light.a", "light.b"]}],
        "lighting": {
            "managed_targets": {"groups": ["room"]},
            "baseline": [{"targets": {"groups": ["room"]}, "state": "off"}],
        },
        "routines": [
            {
                "id": "daily",
                "name": "Daily",
                "steps": [
                    {
                        "id": "wake",
                        "name": "Wake",
                        "when": {"clock_range": {"earliest": "06:40", "latest": "07:20"}},
                        "actions": [
                            {
                                "action": "turn_on",
                                "targets": {"groups": ["room"]},
                                "data": {"brightness_pct": 60},
                            }
                        ],
                    },
                    {
                        "id": "leave",
                        "name": "Leave",
                        "when": {
                            "relative_to": "wake",
                            "offset_range": {"min": "30m", "max": "45m"},
                        },
                        "actions": [{"action": "turn_off", "targets": {"groups": ["room"]}}],
                    },
                ],
                "activities": [
                    {
                        "id": "tv",
                        "name": "TV",
                        "when": {"clock_range": {"earliest": "19:45", "latest": "20:15"}},
                        "duration": {"fixed": "45m"},
                        "resources": ["remote.harmony"],
                        "on_start": [
                            {
                                "action": "remote.turn_on",
                                "targets": {"entities": ["remote.harmony"]},
                                "data": {"activity": "Watch TV"},
                            }
                        ],
                        "on_end": [
                            {
                                "action": "remote.turn_off",
                                "targets": {"entities": ["remote.harmony"]},
                            }
                        ],
                    }
                ],
                "activity_windows": [
                    {
                        "id": "room_use",
                        "name": "Room use",
                        "between": {"start": {"clock": "08:00"}, "end": {"clock": "12:00"}},
                        "cycles": {"min": 2, "max": 4},
                        "on_duration": {"min": "5m", "max": "20m"},
                        "min_gap": "10m",
                        "targets": {"groups": ["room"]},
                    }
                ],
            }
        ],
    }
