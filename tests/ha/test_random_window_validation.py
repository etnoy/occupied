"""Hard overlap errors cannot replace a controller's saved program."""

from copy import deepcopy
from datetime import timedelta

from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

from custom_components.occupied.editor import program_document
from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.storage import program_store
from custom_components.occupied.validation import validate_program


async def test_overlapping_windows_fail_editor_validation_and_save(hass, hass_ws_client):
    original = {"schema_version": 1, "name": "Safe"}
    entry = MockConfigEntry(domain="occupied", data={"program": original})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    engine = entry.runtime_data
    revision = program_document(engine)["revision"]
    candidate = deepcopy(original) | {
        "random": {
            "evening": {
                "start": {"absolute_time": {"start": "22:00", "end": "23:30"}},
                "end": {"absolute_time": {"start": "23:00", "end": "23:59"}},
                "count": 1,
                "on": {"action": "turn_on", "entities": ["switch.test"]},
                "off": {"action": "turn_off", "entities": ["switch.test"]},
            }
        }
    }
    client = await hass_ws_client(hass)
    for identifier, command in enumerate(["editor_validate", "save"], start=1):
        await client.send_json(
            {
                "id": identifier,
                "type": "occupied/" + command,
                "config_entry_id": entry.entry_id,
                "program": candidate,
                **({"expected_revision": revision} if command == "save" else {}),
            }
        )
        response = await client.receive_json()
        assert response["success"] and not response["result"]["valid"]
        assert any(
            issue["code"] == "random_window_overlap" and issue["severity"] == "error"
            for issue in response["result"]["issues"]
        )
    assert entry.data["program"] == original
    assert await program_store(hass, entry.entry_id).async_load() is None
    assert program_document(engine)["revision"] == revision


async def test_dynamic_overlap_keeps_controller_running_for_a_month(hass, freezer):
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    freezer.move_to("2026-10-01T06:59:00+00:00")
    calls = []

    async def service(call):
        calls.append(call)

    hass.services.async_register("script", "turn_on", service)
    for entity in ("script.morning", "script.dinner", "script.evening"):
        hass.states.async_set(entity, "off")
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Recoverable overlap",
            "steps": {
                "morning": {
                    "timing": {"absolute_time": {"start": "07:00"}},
                    "action": "script.turn_on",
                    "entities": ["script.morning"],
                },
                "dinner": {
                    "timing": {"absolute_time": {"start": "18:00", "end": "21:30"}},
                    "action": "script.turn_on",
                    "entities": ["script.dinner"],
                },
            },
            "random": {
                "evening": {
                    "start": {"relative_to": {"step": "dinner", "end_offset": "1h"}},
                    "end": {"absolute_time": {"start": "22:00", "end": "23:00"}},
                    "count": 1,
                    "min_duration": "5m",
                    "max_duration": "5m",
                    "on": {"action": "script.turn_on", "entities": ["script.evening"]},
                    "off": {"action": "script.turn_on", "entities": ["script.evening"]},
                }
            },
        }
    )
    engine = DailyEngine(hass, "overlap-month", program)
    skipped = False
    try:
        await engine.async_prepare()
        engine._seed = "overlap-month"
        await engine.async_start()
        await engine.async_set_enabled(True)
        end = dt_util.parse_datetime("2026-11-01T00:00:00+00:00")
        while engine._queue and engine._queue[0].at < end:
            assert engine.active and engine.status != "error"
            at = engine._queue[0].at + timedelta(milliseconds=1)
            freezer.move_to(at)
            async_fire_time_changed(hass, dt_util.utcnow())
            await hass.async_block_till_done()
            skipped |= any(item["outcome"] == "random_window_skipped" for item in engine.outcomes)
        assert engine.active and engine.status != "error"
        assert sum("script.morning" in call.data["entity_id"] for call in calls) == 31
        assert skipped
    finally:
        await engine.async_close(cleanup=False)
