"""Durable saves report errors even when HA's storage layer swallows them."""

from unittest.mock import AsyncMock

import pytest
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store
from homeassistant.util.file import WriteError

from custom_components.occupied.storage import DurableStore


async def test_durable_save_surfaces_write_failure(hass, monkeypatch):
    write = AsyncMock(side_effect=WriteError("disk is full"))
    store = DurableStore(hass, 1, "occupied.write_failure", atomic_writes=True)
    # Restore before HA's storage fixture tears down its own patch.
    with monkeypatch.context() as patch:
        patch.setattr(Store, "_async_write_data", write)
        with pytest.raises(HomeAssistantError, match="disk is full"):
            await store.async_save({"program": "must survive restart"})
    write.assert_awaited_once()
