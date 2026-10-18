"""Expected planner-cache upgrades are informational; damaged caches remain errors."""

import logging

import pytest
from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.planner import PLANNER_VERSION
from custom_components.occupied.validation import validate_program


@pytest.mark.parametrize(
    "change", ["old_version", "future_version", "corrupt", "malformed_version"]
)
async def test_obsolete_plans_rebuild_without_replaying_completed_steps(
    hass, hass_storage, freezer, caplog, change
):
    freezer.move_to("2026-10-13T18:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    calls = []

    async def service(call):
        calls.append(call)

    hass.services.async_register("script", "turn_on", service)
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Cache upgrade",
            "steps": {
                "clock": {
                    "timing": {"absolute_time": {"start": "18:01"}},
                    "action": "script.turn_on",
                    "entities": ["script.clock"],
                }
            },
        }
    )
    original = DailyEngine(hass, "cache-upgrade", program)
    restored = None
    try:
        await original.async_prepare()
        await original.async_start()
        await original.async_set_enabled(True)
        freezer.move_to("2026-10-13T18:01:00.001+00:00")
        async_fire_time_changed(hass, dt_util.utcnow())
        await hass.async_block_till_done()
        assert len(calls) == 1
        await original.async_close(cleanup=False)
        saved = hass_storage["occupied.cache-upgrade.runtime"]["data"]
        if change == "corrupt":
            saved["plan_fingerprints"][0].pop("fingerprint")
        elif change == "malformed_version":
            saved["plan_fingerprints"][0]["planner_version"] = "invalid"
        else:
            for plan in saved["plan_fingerprints"]:
                plan["planner_version"] = PLANNER_VERSION + (
                    1 if change == "future_version" else -1
                )
        caplog.clear()
        caplog.set_level(logging.INFO, logger="custom_components.occupied.engine_daily")
        restored = DailyEngine(hass, "cache-upgrade", program)
        await restored.async_prepare()
        records = [
            record
            for record in caplog.records
            if record.name == "custom_components.occupied.engine_daily"
        ]
        if change in {"corrupt", "malformed_version"}:
            assert any(record.levelno == logging.ERROR for record in records)
        else:
            assert not any(record.levelno >= logging.WARNING for record in records)
            assert any(
                record.levelno == logging.INFO and "version" in record.getMessage()
                for record in records
            )
        await restored.async_start()
        assert restored.active and restored._cancel_timer is not None
        assert restored._plans and all(
            plan.planner_version == PLANNER_VERSION for plan in restored._plans.values()
        )
        freezer.move_to("2026-10-13T18:02:00.001+00:00")
        async_fire_time_changed(hass, dt_util.utcnow())
        await hass.async_block_till_done()
        assert len(calls) == 1
    finally:
        await original.async_close()
        if restored:
            await restored.async_close()
