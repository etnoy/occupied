"""Real authenticated HA API previews cannot touch the live timer queue or devices."""

from datetime import date

import pytest

from custom_components.occupied.preview import preview_draft
from custom_components.occupied.time_utils import PlanningContext
from custom_components.occupied.validation import program_data


async def test_loaded_preview_refreshes_without_live_mutation(
    hass, entry, devices, saved_permission, program_dict, hass_ws_client
):
    hass.config_entries.async_update_entry(entry, data={"program": program_dict})
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    engine = entry.runtime_data
    before = engine.snapshot()
    timer = engine._cancel_timer
    client = await hass_ws_client(hass)
    args = {
        "type": "occupied/preview",
        "config_entry_id": entry.entry_id,
        "date": "2026-10-06",
        "days": 7,
    }
    await client.send_json({"id": 1, **args})
    result = await client.receive_json()
    assert result["success"] and result["result"]["valid"]
    expected = preview_draft(
        program_dict,
        date(2026, 10, 6),
        7,
        engine._seed,
        PlanningContext(
            hass.config.time_zone,
            hass.config.latitude,
            hass.config.longitude,
            hass.config.elevation,
        ),
    )
    expected["program"] = program_data(engine.program)
    assert result["result"] == expected
    await client.send_json({"id": 2, **args})
    refreshed = await client.receive_json()
    assert refreshed["result"] == expected
    assert engine.snapshot() == before
    assert engine._cancel_timer is timer
    assert not devices


async def test_preview_requires_a_loaded_schedule(hass, entry, hass_ws_client):
    assert await hass.config_entries.async_setup(entry.entry_id)
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/preview",
            "config_entry_id": entry.entry_id,
            "date": "2026-10-06",
        }
    )
    result = await client.receive_json()
    assert not result["success"]
    assert result["error"]["code"] == "preview_unavailable"


async def test_draft_validation_and_id_migration_return_reviewable_model(
    hass, entry, devices, program_dict, hass_ws_client
):
    assert await hass.config_entries.async_setup(entry.entry_id)
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "occupied/validate",
            "config_entry_id": entry.entry_id,
            "program": program_dict | {"misspelled": True},
        }
    )
    result = await client.receive_json()
    assert result["success"] and not result["result"]["valid"]
    assert result["result"]["issues"][0]["path"] == "$.misspelled"
    await client.send_json(
        {
            "id": 2,
            "type": "occupied/rename_id",
            "config_entry_id": entry.entry_id,
            "program": program_dict,
            "kind": "step",
            "old": "wake",
            "new": "morning",
        }
    )
    result = await client.receive_json()
    assert result["result"]["valid"]
    assert (
        result["result"]["program"]["steps"]["leave"]["timing"]["relative_to"]["step"] == "morning"
    )
    assert not devices


@pytest.mark.parametrize(
    "command, extra",
    [
        ("occupied/validate", {}),
        ("occupied/preview", {"date": "2026-10-06"}),
        ("occupied/export", {}),
        ("occupied/rename_id", {"kind": "step", "old": "wake", "new": "morning"}),
    ],
)
async def test_all_draft_operations_require_admin(
    hass, entry, devices, program_dict, hass_ws_client, hass_read_only_access_token, command, extra
):
    assert await hass.config_entries.async_setup(entry.entry_id)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await client.send_json(
        {
            "id": 1,
            "type": command,
            "config_entry_id": entry.entry_id,
            **({"program": program_dict} if command != "occupied/preview" else {}),
            **extra,
        }
    )
    result = await client.receive_json()
    assert not result["success"]
    assert result["error"]["code"] == "unauthorized"
