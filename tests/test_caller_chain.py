"""Prove startup → gate → real HA timers → real service registry without a browser."""

import asyncio
from datetime import timedelta

import pytest
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import Context, CoreState
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed


async def advance(hass, freezer, seconds):
    freezer.move_to(dt_util.utcnow() + timedelta(seconds=seconds))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


async def load(hass, entry, *, running=True):
    hass.set_state(CoreState.running if running else CoreState.not_running)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    return entry.runtime_data


async def test_already_armed_at_startup_drives_services_without_browser(
    hass, entry, devices, saved_permission, freezer
):
    engine = await load(hass, entry, running=False)
    assert not engine.active
    assert not devices
    assert engine.status == "waiting"
    await hass.async_start()
    await hass.async_block_till_done()
    assert engine.active
    assert engine.session == 1
    assert engine.status == "transitioning"
    assert not devices  # No initial cutover.

    await advance(hass, freezer, 30)
    assert [(call.domain, call.service) for call in devices] == [("light", "turn_on")]
    assert devices[0].data["brightness"] == 99
    await advance(hass, freezer, 30)
    assert devices[1].data["brightness"] == 178
    assert engine.status == "active"
    await advance(hass, freezer, 10)
    assert devices[-1].domain == "light"
    assert devices[-1].service == "turn_on"
    await advance(hass, freezer, 5)
    assert devices[-1].domain == "remote"
    assert devices[-1].data["activity"] == "Watch TV"
    started_at = dt_util.utcnow()
    assert engine.remote_deadline == started_at + timedelta(seconds=45)
    await advance(hass, freezer, 15)
    assert devices[-1].domain == "light"
    assert devices[-1].service == "turn_off"
    await advance(hass, freezer, 29)
    assert not any(call.domain == "remote" and call.service == "turn_off" for call in devices)
    await advance(hass, freezer, 1)
    assert devices[-1].domain == "remote"
    assert devices[-1].service == "turn_off"
    assert engine.status == "complete"
    assert engine.next_event is None
    assert all(call.context.id for call in devices)


@pytest.mark.parametrize("allowed", ["armed", "armed_away"])
async def test_allowed_states_do_not_restart_session(
    hass, entry, devices, saved_permission, freezer, allowed
):
    hass.states.async_set("sensor.alarm", allowed)
    engine = await load(hass, entry)
    deadline, generation = engine.handover_deadline, engine.generation
    hass.states.async_set("sensor.alarm", "armed_away" if allowed == "armed" else "armed")
    await hass.async_block_till_done()
    assert engine.session == 1
    assert engine.generation == generation
    assert engine.handover_deadline == deadline
    await advance(hass, freezer, 30)
    assert len(devices) == 1


async def test_permission_switch_persists_and_rearming_cannot_undo_stop(
    hass, entry, devices, freezer
):
    engine = await load(hass, entry)
    assert not engine.enabled
    switch = next(
        state.entity_id
        for state in hass.states.async_all("switch")
        if state.entity_id.startswith("switch.occupied")
    )
    await hass.services.async_call("switch", "turn_on", {"entity_id": switch}, blocking=True)
    assert engine.active
    await hass.services.async_call("switch", "turn_off", {"entity_id": switch}, blocking=True)
    assert not engine.enabled
    hass.states.async_set("sensor.alarm", "disarmed")
    await hass.async_block_till_done()
    hass.states.async_set("sensor.alarm", "armed_away")
    await hass.async_block_till_done()
    await advance(hass, freezer, 200)
    assert not devices
    assert await hass.config_entries.async_reload(entry.entry_id)
    assert not entry.runtime_data.enabled
    assert not entry.runtime_data.active


@pytest.mark.parametrize("state", ["disarmed", "unknown", "unavailable", "Armed"])
async def test_start_does_not_bypass_gate(hass, entry, devices, freezer, state):
    hass.states.async_set("sensor.alarm", state)
    engine = await load(hass, entry)
    await hass.services.async_call(
        "occupied", "start", {"config_entry_id": entry.entry_id}, blocking=True
    )
    assert engine.enabled
    assert not engine.active
    await advance(hass, freezer, 200)
    assert not devices


async def test_disarm_cancels_handover_and_stale_callback(
    hass, entry, devices, saved_permission, freezer
):
    engine = await load(hass, entry)
    generation = engine.generation
    await advance(hass, freezer, 30)
    hass.states.async_set("sensor.alarm", "disarmed")
    await hass.async_block_till_done()
    assert not engine.active
    assert engine.next_event is None
    await advance(hass, freezer, 200)
    await engine._async_dispatch(generation)
    assert len(devices) == 1
    assert engine.status == "inactive"


async def test_disarm_ends_only_owned_remote(hass, entry, devices, saved_permission, freezer):
    engine = await load(hass, entry)
    await advance(hass, freezer, 75)
    assert engine.remote_owned
    hass.states.async_set("sensor.alarm", "disarmed")
    await hass.async_block_till_done()
    assert devices[-1].domain == "remote"
    assert devices[-1].service == "turn_off"
    count = len(devices)
    await advance(hass, freezer, 300)
    assert len(devices) == count


async def test_manual_remote_activity_change_suppresses_end(
    hass, entry, devices, saved_permission, freezer
):
    engine = await load(hass, entry)
    await advance(hass, freezer, 75)
    hass.states.async_set(
        "remote.harmony", "on", {"current_activity": "Play Game"}, context=Context()
    )
    await hass.async_block_till_done()
    assert not engine.remote_owned
    await advance(hass, freezer, 60)
    assert not any(call.domain == "remote" and call.service == "turn_off" for call in devices)


async def test_delayed_remote_start_receives_full_duration(
    hass, entry, devices, saved_permission, freezer
):
    engine = await load(hass, entry)
    await advance(hass, freezer, 100)
    assert engine.remote_deadline == dt_util.utcnow() + timedelta(seconds=45)
    await advance(hass, freezer, 44)
    assert not any(call.domain == "remote" and call.service == "turn_off" for call in devices)
    await advance(hass, freezer, 1)
    assert devices[-1].domain == "remote"
    assert devices[-1].service == "turn_off"


async def test_reload_and_unload_remove_work_and_owned_activity(
    hass, entry, devices, saved_permission, freezer
):
    old = await load(hass, entry)
    await advance(hass, freezer, 75)
    assert old.remote_owned
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    engine = entry.runtime_data
    assert old.closed
    assert not old._unsubs
    assert old._cancel_timer is None
    assert engine.enabled
    assert engine.active
    assert devices[-1].domain == "remote"
    assert devices[-1].service == "turn_off"
    assert await hass.config_entries.async_unload(entry.entry_id)
    count = len(devices)
    await advance(hass, freezer, 500)
    hass.states.async_set("sensor.alarm", "armed_away")
    await hass.async_block_till_done()
    assert len(devices) == count
    assert not engine._unsubs
    assert engine._cancel_timer is None
    assert "occupied" not in hass.data.get("frontend_panels", {})
    with pytest.raises(HomeAssistantError):
        await hass.services.async_call(
            "occupied", "start", {"config_entry_id": entry.entry_id}, blocking=True
        )


async def test_disarm_during_device_call_blocks_later_light_calls(
    hass, entry, devices, saved_permission, freezer
):
    engine = await load(hass, entry)
    submitted = asyncio.Event()
    release = asyncio.Event()

    async def slow(call):
        devices.append(call)
        submitted.set()
        await release.wait()

    hass.services.async_register("light", "turn_on", slow)
    freezer.move_to(dt_util.utcnow() + timedelta(seconds=60))
    async_fire_time_changed(hass, dt_util.utcnow())
    await submitted.wait()
    hass.states.async_set("sensor.alarm", "disarmed")
    await asyncio.sleep(0)
    release.set()
    await hass.async_block_till_done()
    assert len(devices) == 1
    assert not engine.active


async def test_service_failure_does_not_stall_remote(
    hass, entry, devices, saved_permission, freezer
):
    engine = await load(hass, entry)

    async def broken(call):
        raise HomeAssistantError("Virtual light failed")

    hass.services.async_register("light", "turn_on", broken)
    await advance(hass, freezer, 75)
    assert engine.remote_owned
    assert "Virtual light failed" in engine.last_error
    await advance(hass, freezer, 45)
    assert devices[-1].domain == "remote"
    assert devices[-1].service == "turn_off"


async def test_onoff_only_light_changes_at_handover_completion(
    hass, entry, devices, saved_permission, freezer
):
    hass.states.async_set("light.proof", "off", {"supported_color_modes": ["onoff"]})
    await load(hass, entry)
    await advance(hass, freezer, 59)
    assert not devices
    await advance(hass, freezer, 1)
    assert devices[0].data == {"entity_id": "light.proof"}


async def test_pause_keeps_permission_and_resume_rechecks_gate(
    hass, entry, devices, saved_permission, freezer
):
    engine = await load(hass, entry)
    await hass.services.async_call(
        "occupied", "pause", {"config_entry_id": entry.entry_id}, blocking=True
    )
    assert engine.enabled and engine.paused and not engine.active
    hass.states.async_set("sensor.alarm", "disarmed")
    await hass.async_block_till_done()
    await hass.services.async_call(
        "occupied", "resume", {"config_entry_id": entry.entry_id}, blocking=True
    )
    assert engine.enabled and not engine.paused and not engine.active
    await advance(hass, freezer, 200)
    assert not devices
