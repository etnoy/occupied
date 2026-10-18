"""Dispatch keeps its write-ahead journal without serializing full cached plans."""

from copy import deepcopy
from unittest.mock import patch

import pytest
from homeassistant.core import CoreState

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.planner import DailyPlan
from custom_components.occupied.validation import validate_program


@pytest.mark.parametrize("legacy", [False, True])
async def test_compact_dispatch_and_identical_restart(
    hass, hass_storage, freezer, monkeypatch, legacy
):
    freezer.move_to("2026-10-13T18:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    hass.states.async_set("switch.proof", "off")
    data = {
        "schema_version": 1,
        "name": "Before rename",
        "steps": {
            "on": {
                "timing": {"absolute_time": {"start": "18:01"}},
                "action": "turn_on",
                "entities": ["switch.proof"],
            }
        },
    }
    program = validate_program(data)
    engine = DailyEngine(hass, "compact-cache", program)
    restored = None
    snapshots, calls = [], []
    try:
        await engine.async_prepare()
        await engine.async_start()
        await engine.async_set_enabled(True)
        save = engine._store.async_save

        async def capture(snapshot):
            snapshots.append(deepcopy(snapshot))
            await save(snapshot)

        monkeypatch.setattr(engine._store, "async_save", capture)

        async def service(call):
            assert snapshots[-1]["journal"]["probe"]["status"] == "pending"
            calls.append(call)
            hass.states.async_set("switch.proof", "on", context=call.context)

        hass.services.async_register("switch", "turn_on", service)
        event = next(event for plan in engine._plans.values() for event in plan.events)
        serialize = DailyPlan.to_dict
        with patch.object(DailyPlan, "to_dict", autospec=True, side_effect=serialize) as spy:
            assert await engine._call(event.action, "probe", engine.generation)
            assert spy.call_count == 0
        assert len(calls) == 1 and len(snapshots) == 2
        assert [snapshot["journal"]["probe"]["status"] for snapshot in snapshots] == [
            "pending",
            "dispatched",
        ]
        assert all(
            "plans" not in snapshot and snapshot["plan_fingerprints"] for snapshot in snapshots
        )
        assert all("events" not in record for record in snapshots[-1]["plan_fingerprints"])
        before = {day: plan.to_dict() for day, plan in engine._plans.items()}
        await engine.async_close(cleanup=False)
        if legacy:
            saved = hass_storage["occupied.compact-cache.runtime"]["data"]
            saved.pop("plan_fingerprints")
            saved["plans"] = list(before.values())
        # Presentation edits must preserve the cached source revisions/fingerprints.
        restored = DailyEngine(
            hass, "compact-cache", validate_program(data | {"name": "After rename"})
        )
        await restored.async_prepare()
        assert {day: plan.to_dict() for day, plan in restored._plans.items()} == before
        assert restored._journal["probe"]["status"] == "dispatched"
        await restored.async_start()
        assert len(calls) == 1
        saved = hass_storage["occupied.compact-cache.runtime"]["data"]
        assert "plans" not in saved and saved["plan_fingerprints"]
    finally:
        await engine.async_close(cleanup=False)
        if restored:
            await restored.async_close(cleanup=False)
