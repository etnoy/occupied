"""Multiple households through real HA entries, runtime, storage and admin APIs."""

import asyncio
from copy import deepcopy
from unittest.mock import patch

import pytest
import voluptuous as vol
import yaml
from homeassistant.components.frontend import DATA_PANELS
from homeassistant.core import CoreState
from homeassistant.helpers import issue_registry as ir
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.occupied import CONFIG_SCHEMA
from custom_components.occupied.bootstrap import async_bootstrap, check_bootstrap
from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.instances import instance_documents
from custom_components.occupied.managed import source_lock
from custom_components.occupied.validation import program_revision


def household(name, entity):
    return {
        "schema_version": 1,
        "name": name,
        "steps": {
            "evening": {
                "name": "Evening",
                "timing": {"absolute_time": {"start": "20:00", "end": "20:30"}},
                "action": "turn_on",
                "entities": [entity],
            }
        },
    }


@pytest.fixture
def households(hass, tmp_path, freezer):
    freezer.move_to("2026-10-06T18:00:00+00:00")
    hass.config.config_dir = str(tmp_path)
    hass.set_state(CoreState.running)
    (tmp_path / "occupied").mkdir()
    programs = {}
    for name in ("main", "guest"):
        programs[name] = household(name, f"light.{name}")
        (tmp_path / "occupied" / f"{name}.yaml").write_text(yaml.safe_dump(programs[name]))
        hass.states.async_set(f"sensor.{name}", "armed")
        hass.states.async_set(f"light.{name}", "off")
    return programs


async def setup_pair(hass, households, sources=("file", "file")):
    # Register the component before entries exist; first component setup also
    # schedules existing entries and can race the explicit concurrent setup below.
    assert await async_setup_component(hass, "occupied", {})
    entries = []
    for name, source in zip(("main", "guest"), sources, strict=True):
        entry = MockConfigEntry(
            domain="occupied",
            unique_id=f"instance:{name}",
            title=name,
            data={
                "name": name,
                "source": source,
                **(
                    {"config_file": f"occupied/{name}.yaml"}
                    if source == "file"
                    else {"program": households[name]}
                ),
            },
        )
        entry.add_to_hass(hass)
        entries.append(entry)
    assert all(
        await asyncio.gather(*(hass.config_entries.async_setup(e.entry_id) for e in entries))
    )
    await hass.async_block_till_done()
    return entries


async def test_instance_discovery_does_not_advertise_setup_runtime_as_loaded(hass, households):
    observed = []
    start = DailyEngine.async_start

    async def inspect_setup(engine):
        await start(engine)
        observed.extend(
            document
            for document in instance_documents(hass)
            if document["config_entry_id"] == engine.entry_id
        )

    with patch.object(DailyEngine, "async_start", inspect_setup):
        await setup_pair(hass, households)
    assert observed and all(item["state"] == "setup_in_progress" for item in observed)
    assert all(not item["loaded"] for item in observed)
    assert all(item["loaded"] for item in instance_documents(hass))


async def test_last_entry_reload_retains_the_registered_panel(hass, households):
    main, guest = await setup_pair(hass, households)
    assert await hass.config_entries.async_remove(guest.entry_id)
    panel = hass.data[DATA_PANELS]["occupied"]
    assert await hass.config_entries.async_reload(main.entry_id)
    await hass.async_block_till_done()
    assert hass.data[DATA_PANELS]["occupied"] is panel


async def ws(client, kind, identifier=1, **data):
    await client.send_json({"id": identifier, "type": f"occupied/{kind}", **data})
    return await client.receive_json()


@pytest.mark.parametrize("sources", [("file", "file"), ("gui", "gui"), ("gui", "file")])
async def test_permissions_plans_and_restart_are_independent(hass, households, sources, devices):
    main, guest = await setup_pair(hass, households, sources)
    first, second = main.runtime_data, guest.runtime_data
    assert first._seed != second._seed
    assert first.signal != second.signal
    await first.async_set_enabled(True)
    assert first.active and not second.enabled
    await second.async_set_enabled(True)
    before = deepcopy(second.snapshot())
    plans = deepcopy(second._plans)
    await first.async_set_paused(True)
    await hass.async_block_till_done()
    assert not first.active and second.snapshot() == before
    assert await hass.config_entries.async_reload(main.entry_id)
    await hass.async_block_till_done()
    assert guest.runtime_data is second and second.snapshot() == before
    assert second._plans == plans
    assert main.runtime_data._seed == first._seed
    assert main.runtime_data.enabled and main.runtime_data.paused and not main.runtime_data.active
    assert not devices


async def test_files_reload_fail_and_recover_independently(hass, households, tmp_path):
    main, guest = await setup_pair(hass, households)
    first, second = main.runtime_data, guest.runtime_data
    before = deepcopy(second.snapshot())
    path = tmp_path / "occupied" / "main.yaml"
    path.write_text("schema_version: invalid")
    result = await first.source_manager.async_reload()
    assert not result["valid"] and first.program.name == "main"
    assert second.snapshot() == before
    assert ("occupied", f"managed_file_{main.entry_id}") in ir.async_get(hass).issues
    assert ("occupied", f"managed_file_{guest.entry_id}") not in ir.async_get(hass).issues
    path.write_text(yaml.safe_dump(households["main"] | {"name": "Main renamed"}))
    assert (await first.source_manager.async_reload())["valid"]
    assert first.program.name == "Main renamed" and second.snapshot() == before
    assert ("occupied", f"managed_file_{main.entry_id}") not in ir.async_get(hass).issues


async def test_manual_enforcement_is_independent_between_controllers(hass, households, devices):
    await hass.config.async_set_time_zone("UTC")
    for program in households.values():
        program["steps"]["evening"]["timing"] = {"absolute_time": {"start": "17:00"}}
    main, guest = await setup_pair(hass, households, ("gui", "gui"))
    await main.runtime_data.async_set_enabled(True)
    await guest.runtime_data.async_set_enabled(True)
    before = deepcopy(guest.runtime_data.snapshot())
    await main.runtime_data.async_enforce_state_now()
    assert [call.data["entity_id"] for call in devices] == ["light.main"]
    assert guest.runtime_data.snapshot() == before


async def test_saving_one_gui_program_preserves_the_other_revision(
    hass, households, hass_ws_client
):
    main, guest = await setup_pair(hass, households, ("gui", "gui"))
    second = guest.runtime_data
    before = deepcopy(second.snapshot())
    client = await hass_ws_client(hass)
    response = await ws(
        client,
        "save",
        config_entry_id=main.entry_id,
        expected_revision=program_revision(main.runtime_data.program),
        program=households["main"] | {"name": "Renamed main"},
    )
    assert response["success"] and response["result"]["valid"]
    assert main.runtime_data.program.name == "Renamed main"
    assert second.snapshot() == before and guest.runtime_data is second


async def test_slow_file_reload_does_not_block_another_instance(hass, households):
    main, guest = await setup_pair(hass, households)
    entered, release = asyncio.Event(), asyncio.Event()
    manager = main.runtime_data.source_manager
    replace = main.runtime_data.async_replace_program

    async def wait_replace(*args, **kwargs):
        entered.set()
        await release.wait()
        await replace(*args, **kwargs)

    with patch.object(main.runtime_data, "async_replace_program", side_effect=wait_replace):
        task = asyncio.create_task(
            manager.async_select("gui", None, program_revision(main.runtime_data.program))
        )
        await entered.wait()
        try:
            assert (await asyncio.wait_for(guest.runtime_data.source_manager.async_reload(), 2))[
                "valid"
            ]
            assert source_lock(hass, main.entry_id) is not source_lock(hass, guest.entry_id)
        finally:
            release.set()
            await task


async def test_removing_one_entry_keeps_other_panel_stores_and_source(
    hass, households, hass_storage, tmp_path
):
    main, guest = await setup_pair(hass, households)
    second = guest.runtime_data
    await second.async_set_enabled(True)
    before = deepcopy(second.snapshot())
    assert await hass.config_entries.async_remove(main.entry_id)
    await hass.async_block_till_done()
    assert "occupied" in hass.data[DATA_PANELS]
    assert second.snapshot() == before and not second.closed
    assert not any(key.startswith(f"occupied.{main.entry_id}.") for key in hass_storage)
    assert any(key.startswith(f"occupied.{guest.entry_id}.") for key in hass_storage)
    assert (tmp_path / "occupied" / "main.yaml").exists()
    assert await hass.config_entries.async_unload(guest.entry_id)
    assert "occupied" in hass.data[DATA_PANELS]
    assert await hass.config_entries.async_remove(guest.entry_id)
    assert "occupied" not in hass.data[DATA_PANELS]


async def test_setup_failure_does_not_remove_existing_panel(hass, households):
    main, guest = await setup_pair(hass, households)
    assert await hass.config_entries.async_unload(main.entry_id)
    with patch(
        "custom_components.occupied.engine_daily.DailyEngine.async_start",
        side_effect=RuntimeError("setup failed"),
    ):
        assert not await hass.config_entries.async_setup(main.entry_id)
    assert "occupied" in hass.data[DATA_PANELS] and not guest.runtime_data.closed


async def test_named_bootstrap_is_idempotent_and_preserves_changed_sources(hass, households):
    config = {
        "instances": [{"id": name, "config_file": f"occupied/{name}.yaml"} for name in households]
    }
    assert await async_setup_component(hass, "occupied", {"occupied": config})
    await hass.async_block_till_done()
    entries = hass.config_entries.async_entries("occupied")
    assert {entry.unique_id for entry in entries} == {"instance:main", "instance:guest"}
    identities = {entry.unique_id: entry.entry_id for entry in entries}
    await async_bootstrap(hass, config)
    assert {
        e.unique_id: e.entry_id for e in hass.config_entries.async_entries("occupied")
    } == identities
    main = next(e for e in entries if e.unique_id == "instance:main")
    changed = {
        "instances": [
            config["instances"][0] | {"config_file": "occupied/changed.yaml"},
            config["instances"][1],
        ]
    }
    await async_bootstrap(hass, changed)
    assert main.data["config_file"] == "occupied/main.yaml"
    assert ("occupied", f"source_conflict_{main.entry_id}") in ir.async_get(hass).issues
    check_bootstrap(hass, main, {"instances": [config["instances"][1]]})
    assert ("occupied", f"source_conflict_{main.entry_id}") not in ir.async_get(hass).issues
    assert len(hass.config_entries.async_entries("occupied")) == 2


async def test_assigning_yaml_id_preserves_legacy_entry_and_runtime(hass, households):
    legacy = MockConfigEntry(
        domain="occupied",
        unique_id="occupied",
        data={"name": "Main", "source": "file", "config_file": "occupied/main.yaml"},
    )
    legacy.add_to_hass(hass)
    assert await hass.config_entries.async_setup(legacy.entry_id)
    engine = legacy.runtime_data
    await engine.async_set_enabled(True)
    seed = engine._seed
    await async_bootstrap(
        hass, {"instances": [{"id": "main", "config_file": "occupied/main.yaml"}]}
    )
    await hass.async_block_till_done()
    assert legacy.unique_id == "instance:main" and legacy.runtime_data is engine
    assert legacy.runtime_data._seed == seed and legacy.runtime_data.enabled
    assert len(hass.config_entries.async_entries("occupied")) == 1


async def test_one_invalid_bootstrap_file_does_not_disable_the_other(hass, households, tmp_path):
    (tmp_path / "occupied" / "guest.yaml").write_text("bad: yaml")
    config = {
        "instances": [{"id": name, "config_file": f"occupied/{name}.yaml"} for name in households]
    }
    assert await async_setup_component(hass, "occupied", {"occupied": config})
    await hass.async_block_till_done()
    docs = instance_documents(hass)
    assert len(docs) == 2 and all(doc["loaded"] for doc in docs)
    assert {doc["name"]: doc["source_status"] for doc in docs} == {
        "main": "ready",
        "guest": "error",
    }


@pytest.mark.parametrize(
    "config",
    [
        {"instances": [{"id": "main", "config_file": "a"}, {"id": "main", "config_file": "b"}]},
        {"instances": [{"config_file": "a"}]},
        {"instances": [{"id": "bad id", "config_file": "a"}]},
        {"config_file": "a", "instances": []},
    ],
)
def test_bootstrap_rejects_ambiguous_declarations(config):
    with pytest.raises(vol.Invalid):
        CONFIG_SCHEMA({"occupied": config})


async def test_discovery_includes_unloaded_entries_and_device_overlap(
    hass, households, hass_ws_client
):
    households["guest"] = household("guest", "light.main")
    main, guest = await setup_pair(hass, households, ("gui", "gui"))
    client = await hass_ws_client(hass)
    response = await ws(client, "instances")
    assert response["success"]
    documents = response["result"]
    assert documents[0]["overlaps"] == [
        {"config_entry_id": guest.entry_id, "name": "guest", "entities": ["light.main"]}
    ]
    assert documents[1]["overlaps"][0]["config_entry_id"] == main.entry_id
    assert await hass.config_entries.async_unload(guest.entry_id)
    response = await ws(client, "instances", 2)
    documents = response["result"]
    assert not documents[1]["loaded"] and documents[1]["source"] == "gui"
    assert not documents[0]["overlaps"]


@pytest.mark.parametrize("command", ["instances", "instances_subscribe"])
async def test_instance_discovery_requires_admin(
    hass, households, hass_ws_client, hass_read_only_access_token, command
):
    await setup_pair(hass, households)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    response = await ws(client, command)
    assert not response["success"] and response["error"]["code"] == "unauthorized"


async def test_instance_subscription_tracks_controls_and_unload(hass, households, hass_ws_client):
    main, guest = await setup_pair(hass, households)
    client = await hass_ws_client(hass)
    response = await ws(client, "instances_subscribe")
    assert response["success"]
    event = await client.receive_json()
    assert len(event["event"]) == 2
    await main.runtime_data.async_set_enabled(True)
    await hass.async_block_till_done()

    async def receive_matching(predicate):
        for _ in range(30):
            event = await client.receive_json()
            if predicate(event["event"]):
                return event["event"]
        pytest.fail("Expected instance update was not received")

    docs = await receive_matching(lambda docs: docs[0]["enabled"])
    assert not docs[1]["enabled"]
    assert await hass.config_entries.async_unload(guest.entry_id)
    await hass.async_block_till_done()
    docs = await receive_matching(lambda docs: not docs[1]["loaded"])
    assert docs[0]["enabled"]
    await client.close()
