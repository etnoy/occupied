"""Opt-in real-timer soak: pytest tests/ha/runtime_soak.py (floor and newest)."""

import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from homeassistant.components.light import LightEntityFeature
from homeassistant.core import CoreState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.file_config import load_yaml
from custom_components.occupied.models import controlled_entities
from custom_components.occupied.time_sources import source_entities
from custom_components.occupied.validation import validate_program

ROOT = Path(__file__).resolve().parents[2]
PROGRAMS = sorted([*ROOT.glob("examples/*.yaml"), *ROOT.glob("tests/fixtures/programs/*.yaml")])


@pytest.mark.parametrize("path", PROGRAMS, ids=lambda path: str(path.relative_to(ROOT)))
@pytest.mark.parametrize("month", [3, 10], ids=["spring-DST", "autumn-DST"])
async def test_sixty_days_of_late_timer_dispatch(hass, freezer, path, month, caplog):
    caplog.set_level(logging.WARNING)
    await hass.config.async_set_time_zone("Europe/Stockholm")
    await hass.config.async_update(latitude=59.3, longitude=18.1)
    hass.set_state(CoreState.running)
    start = datetime(2026, month, 1, tzinfo=dt_util.DEFAULT_TIME_ZONE).astimezone(UTC)
    end = start + timedelta(days=60)
    freezer.move_to(start + timedelta(milliseconds=1))
    program = validate_program(load_yaml(path.read_text()))
    for entity in controlled_entities(program):
        hass.states.async_set(
            entity,
            "off",
            {
                "brightness": 0,
                "supported_color_modes": ["brightness"],
                "supported_features": LightEntityFeature.TRANSITION,
                "current_position": 0,
                "current_tilt_position": 0,
            },
        )
    if program.run_condition:
        hass.states.async_set(program.run_condition.entity_id, program.run_condition.state[0])

    def update_sources(day):
        for entity in source_entities(program):
            if entity.startswith("input_datetime."):
                hass.states.async_set(entity, "18:00:00", {"has_time": True, "has_date": False})
            elif entity.startswith("calendar."):
                hass.states.async_set(
                    entity,
                    "off",
                    {
                        "start_time": f"{day}T09:00:00+01:00",
                        "end_time": f"{day}T17:00:00+01:00",
                    },
                )
            else:
                hass.states.async_set(
                    entity, f"{day}T07:00:00+01:00", {"device_class": "timestamp"}
                )

    calls = []

    async def service(call):
        calls.append((call.domain, call.service))
        targets = call.data.get("entity_id", [])
        for entity in [targets] if isinstance(targets, str) else targets:
            previous = hass.states.get(entity)
            attributes = dict(previous.attributes) if previous else {}
            attributes.update(
                {key: value for key, value in call.data.items() if key != "entity_id"}
            )
            hass.states.async_set(
                entity,
                "off" if call.service == "turn_off" else "on",
                attributes,
                context=call.context,
            )

    for domain, services in {
        "light": ["turn_on", "turn_off"],
        "switch": ["turn_on", "turn_off"],
        "scene": ["turn_on"],
        "script": ["turn_on", "turn_off"],
        "cover": ["set_cover_position", "set_cover_tilt_position", "stop_cover"],
    }.items():
        for name in services:
            hass.services.async_register(domain, name, service)
    day = dt_util.now().date()
    update_sources(day)
    engine = DailyEngine(hass, "runtime-soak", program)
    try:
        await engine.async_prepare()
        engine._seed = "soak-0"
        await engine.async_start()
        await engine.async_set_enabled(True)
        cutoff = engine.activation_deadline or dt_util.utcnow()
        startup_skips = {
            engine._key(plan, event)
            for plan in engine._plans.values()
            for event in plan.events
            if event.at <= cutoff
        }
        finished = set()
        ticks = 0
        while engine.next_event and engine.next_event < end:
            freezer.move_to(engine.next_event + timedelta(milliseconds=1))
            async_fire_time_changed(hass, dt_util.utcnow())
            await hass.async_block_till_done()
            if (today := dt_util.now().date()) != day:
                day = today
                update_sources(day)
                await hass.async_block_till_done()
            assert engine.status != "error", engine.reason
            skipped = {
                key
                for key, item in engine._journal.items()
                if item["status"] == "historical_skipped"
            }
            assert not skipped - startup_skips - finished, (
                dt_util.utcnow(),
                {
                    key: item
                    for key, item in engine._journal.items()
                    if key in skipped - startup_skips - finished
                },
            )
            assert not any(
                item["status"] in {"failed", "uncertain", "service_missing"}
                for item in engine._journal.values()
            )
            finished.update(
                key
                for key, item in engine._journal.items()
                if item["status"] != "historical_skipped"
            )
            ticks += 1
            assert ticks < 20000, "Timer failed to advance across the soak window"
        assert engine.active and engine.next_event >= end
        assert calls, "The soak must exercise registered virtual services"
    finally:
        await engine.async_close()
