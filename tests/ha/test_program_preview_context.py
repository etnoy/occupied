"""Program replacement previews use the candidate's sources and isolated latches."""

from copy import deepcopy

import pytest
from homeassistant.core import CoreState

from custom_components.occupied import engine_daily
from custom_components.occupied.engine_daily import DailyEngine
from custom_components.occupied.validation import ProgramError, validate_program


@pytest.fixture
async def replacement_context(hass, freezer):
    freezer.move_to("2026-10-13T18:00:00+00:00")
    await hass.config.async_set_time_zone("UTC")
    hass.set_state(CoreState.running)
    attributes = {"has_time": True, "has_date": False}
    hass.states.async_set("input_datetime.old", "17:00:00", attributes)
    original = validate_program(
        {
            "schema_version": 1,
            "name": "Old source",
            "steps": {
                "old": {
                    "timing": {"relative_to": {"entity": "input_datetime.old"}},
                    "action": "turn_on",
                    "entities": ["switch.proof"],
                }
            },
        }
    )
    engine = DailyEngine(hass, "replacement-context", original)
    await engine.async_prepare()
    engine._context()
    yield engine, attributes
    await engine.async_close(cleanup=False)


def candidate():
    return validate_program(
        {
            "schema_version": 1,
            "name": "New source",
            "random": {
                "evening": {
                    "start": {"relative_to": {"entity": "input_datetime.evening"}},
                    "end": {"absolute_time": {"start": "22:00", "end": "23:00"}},
                    "count": 1,
                    "on": {"action": "turn_on", "entities": ["switch.proof"]},
                    "off": {"action": "turn_off", "entities": ["switch.proof"]},
                }
            },
        }
    )


@pytest.mark.parametrize("evening", ["21:00:00", "22:30:00"])
async def test_replacement_feasibility_matches_a_fresh_engine(hass, replacement_context, evening):
    engine, attributes = replacement_context
    hass.states.async_set("input_datetime.evening", evening, attributes)
    program = candidate()
    fresh = DailyEngine(hass, "fresh-replacement-context", program)
    try:
        await fresh.async_prepare()
        try:
            await fresh._ensure_plans()
        except ValueError:
            feasible = False
        else:
            feasible = True
        if feasible:
            await engine.async_replace_program(program)
            assert engine.program == program
        else:
            before = deepcopy(engine._anchor_latches.snapshot())
            with pytest.raises(ProgramError):
                await engine.async_replace_program(program)
            assert engine.program.name == "Old source"
            assert engine._anchor_latches.snapshot() == before
    finally:
        await fresh.async_close(cleanup=False)


@pytest.mark.parametrize("keep_old", [False, True])
async def test_preview_sees_new_sources_without_pruning_live_latches(
    hass, replacement_context, monkeypatch, keep_old
):
    engine, attributes = replacement_context
    hass.states.async_set("input_datetime.evening", "21:00:00", attributes)
    before = deepcopy(engine._anchor_latches.snapshot())
    assert before["records"]
    hass.states.async_set("input_datetime.old", "19:00:00", attributes)
    preview = engine_daily.preview_dates
    contexts, live_latches = [], []

    def capture(*args, **kwargs):
        contexts.append(kwargs["context"])
        live_latches.append(deepcopy(engine._anchor_latches.snapshot()))
        return preview(*args, **kwargs)

    monkeypatch.setattr(engine_daily, "preview_dates", capture)
    program = candidate()
    if keep_old:
        program = program.model_copy(update={"steps": engine.program.steps})
    await engine.async_replace_program(program)
    assert contexts
    assert set(contexts[0].time_sources) == {
        "input_datetime.evening",
        *(["input_datetime.old"] if keep_old else []),
    }
    if keep_old:
        assert (
            contexts[0].time_source_latches["2026-10-13"]["input_datetime.old"]["state"]
            == "17:00:00"
        )
    else:
        assert not contexts[0].time_source_latches
    assert live_latches[0] == before
