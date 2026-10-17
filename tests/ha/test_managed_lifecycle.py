"""Managed-file polling avoids redundant reads and races with entry unload."""

import asyncio
from datetime import timedelta

import pytest
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

from custom_components.occupied import file_config, managed


@pytest.fixture
async def controller(hass, tmp_path, freezer, monkeypatch):
    freezer.move_to("2026-10-06T18:00:00+00:00")
    hass.config.config_dir = str(tmp_path)
    path = tmp_path / "controller.yaml"
    path.write_text("schema_version: 1\nname: Managed controller\n")
    reads = []
    read = file_config.read_managed

    def counted_read(*args):
        reads.append(args)
        return read(*args)

    monkeypatch.setattr(file_config, "read_managed", counted_read)
    monkeypatch.setattr(managed, "read_managed", counted_read)
    entry = MockConfigEntry(
        domain="occupied",
        title="Managed controller",
        data={"source": "file", "name": "Managed controller", "config_file": path.name},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry, path, reads


async def advance(hass, freezer, seconds):
    freezer.move_to(dt_util.utcnow() + timedelta(seconds=seconds))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done(wait_background_tasks=True)


async def test_first_unchanged_poll_does_not_read_the_file_again(hass, controller, freezer):
    entry, path, reads = controller
    manager = entry.runtime_data.source_manager
    initial_reads = len(reads)
    assert initial_reads == 2
    await advance(hass, freezer, 5)
    await advance(hass, freezer, 1)
    assert len(reads) == initial_reads
    manager._watch()
    await advance(hass, freezer, 5)
    await advance(hass, freezer, 1)
    assert len(reads) == initial_reads
    path.write_text("schema_version: 1\nname: Changed controller\n")
    await advance(hass, freezer, 5)
    await advance(hass, freezer, 1)
    assert len(reads) == initial_reads + 1
    assert entry.runtime_data.program.name == "Changed controller"


async def test_debounced_reload_waiting_for_lock_is_harmless_after_close(
    hass, controller, monkeypatch
):
    entry, _, _ = controller
    manager = entry.runtime_data.source_manager
    lock = managed.source_lock(hass, entry.entry_id)
    entered = asyncio.Event()
    reload = manager.async_reload

    async def entered_reload():
        entered.set()
        return await reload()

    monkeypatch.setattr(manager, "async_reload", entered_reload)
    await lock.acquire()
    job = asyncio.create_task(manager._reload_changed(None))
    try:
        await asyncio.wait_for(entered.wait(), 5)
        manager.close()
    finally:
        lock.release()
    await job


async def test_closed_manager_does_not_recreate_a_repair(hass, controller):
    entry, _, _ = controller
    manager = entry.runtime_data.source_manager
    manager.close()
    manager._report([{"message": "Late validation error"}])
    assert ("occupied", f"managed_file_{entry.entry_id}") not in ir.async_get(hass).issues


async def test_active_reload_errors_remain_visible(controller, monkeypatch):
    entry, _, _ = controller
    manager = entry.runtime_data.source_manager

    async def fail():
        raise HomeAssistantError("Unexpected active reload failure")

    monkeypatch.setattr(manager, "async_reload", fail)
    with pytest.raises(HomeAssistantError, match="Unexpected active"):
        await manager._reload_changed(None)
