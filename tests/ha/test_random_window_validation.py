"""Hard overlap errors cannot replace a controller's saved program."""

from copy import deepcopy

from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.occupied.editor import program_document
from custom_components.occupied.storage import program_store


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
