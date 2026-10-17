"""Setup cleanup unloads platforms only after forwarding them completed."""

from unittest.mock import AsyncMock

import pytest
from homeassistant.exceptions import HomeAssistantError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.occupied.engine_daily import DailyEngine


@pytest.mark.parametrize("stage", ["prepare", "forward", "start"])
async def test_setup_failure_unloads_only_forwarded_platforms(hass, monkeypatch, caplog, stage):
    entry = MockConfigEntry(
        domain="occupied",
        unique_id="failure",
        title="Failure",
        data={"name": "Failure", "program": {"schema_version": 1, "name": "Failure"}},
    )
    entry.add_to_hass(hass)
    unload = AsyncMock(wraps=hass.config_entries.async_unload_platforms)
    monkeypatch.setattr(hass.config_entries, "async_unload_platforms", unload)
    error = HomeAssistantError(f"Expected {stage} failure")
    if stage == "forward":
        monkeypatch.setattr(
            hass.config_entries, "async_forward_entry_setups", AsyncMock(side_effect=error)
        )
    else:
        monkeypatch.setattr(DailyEngine, "async_" + stage, AsyncMock(side_effect=error))
    assert not await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.runtime_data.closed
    if stage == "start":
        unload.assert_awaited_once()
    else:
        unload.assert_not_awaited()
    assert f"Expected {stage} failure" in caplog.text
    assert "Config entry was never loaded" not in caplog.text
