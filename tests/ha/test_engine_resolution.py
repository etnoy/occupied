"""Service entry resolution follows Home Assistant's setup lifecycle."""

import asyncio

import pytest
from homeassistant.config_entries import ConfigEntryState
from homeassistant.exceptions import HomeAssistantError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.occupied import resolve_engine
from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.validation import validate_program


async def test_engine_is_not_resolvable_until_entry_setup_completes(hass, monkeypatch):
    entry = MockConfigEntry(
        domain="occupied",
        title="Preparing controller",
        data={"program": {"schema_version": 1, "name": "Preparing controller"}},
    )
    entry.add_to_hass(hass)
    entered, release = asyncio.Event(), asyncio.Event()
    prepare = DailyEngine.async_prepare

    async def blocked_prepare(engine):
        entered.set()
        await release.wait()
        await prepare(engine)

    monkeypatch.setattr(DailyEngine, "async_prepare", blocked_prepare)
    setup = asyncio.create_task(hass.config_entries.async_setup(entry.entry_id))
    try:
        await asyncio.wait_for(entered.wait(), 5)
        assert entry.state is ConfigEntryState.SETUP_IN_PROGRESS
        assert not entry.runtime_data.closed
        with pytest.raises(HomeAssistantError, match="not loaded"):
            resolve_engine(hass, entry.entry_id)
    finally:
        release.set()
        assert await setup
    assert entry.state is ConfigEntryState.LOADED
    assert resolve_engine(hass, entry.entry_id) is entry.runtime_data


async def test_unloaded_entry_with_leftover_runtime_data_cannot_be_resolved(hass):
    entry = MockConfigEntry(domain="occupied", title="Unloaded controller")
    entry.add_to_hass(hass)
    entry.runtime_data = DailyEngine(
        hass, entry.entry_id, validate_program({"schema_version": 1, "name": entry.title})
    )
    assert entry.state is ConfigEntryState.NOT_LOADED
    with pytest.raises(HomeAssistantError, match="not loaded"):
        resolve_engine(hass, entry.entry_id)
