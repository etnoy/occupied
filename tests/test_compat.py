"""Controller activity lookup across the supported device-registry APIs."""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from homeassistant.core import Context
from homeassistant.helpers import device_registry as dr

from custom_components.occupied.activity import async_log_action
from custom_components.occupied.const import DOMAIN, EVENT_ACTION


@pytest.mark.parametrize("relationship", ["owned", "foreign", "missing"])
async def test_activity_uses_legacy_device_lookup(hass, monkeypatch, relationship):
    device = (
        None
        if relationship == "missing"
        else SimpleNamespace(id="controller-device", config_entries={relationship})
    )
    lookup = Mock(return_value=device)
    registry = SimpleNamespace(async_get_device=lookup)
    monkeypatch.setattr(dr, "async_get", lambda _: registry)
    events = []
    hass.bus.async_listen(EVENT_ACTION, events.append)
    engine = SimpleNamespace(hass=hass, entry_id="owned", config={"name": "House"})
    async_log_action(engine, "switch.turn_on", ["switch.test"], {}, Context())
    await hass.async_block_till_done()
    lookup.assert_called_once_with(identifiers={(DOMAIN, "owned")})
    assert len(events) == 1
    if relationship == "owned":
        assert events[0].data["device_id"] == "controller-device"
    else:
        assert "device_id" not in events[0].data


async def test_activity_prefers_current_device_lookup(hass, monkeypatch):
    lookup = Mock(return_value=SimpleNamespace(id="controller-device"))
    registry = SimpleNamespace(
        async_get_device_by_identifier=lookup,
        async_get_device=Mock(side_effect=AssertionError("Deprecated lookup was called")),
    )
    monkeypatch.setattr(dr, "async_get", lambda _: registry)
    events = []
    hass.bus.async_listen(EVENT_ACTION, events.append)
    engine = SimpleNamespace(hass=hass, entry_id="owned", config={"name": "House"})
    async_log_action(engine, "switch.turn_on", ["switch.test"], {}, Context())
    await hass.async_block_till_done()
    lookup.assert_called_once_with((DOMAIN, "owned"), "owned")
    assert events[0].data["device_id"] == "controller-device"
