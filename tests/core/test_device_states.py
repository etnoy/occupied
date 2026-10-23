"""Catch-up restores persistent intent and forgets opaque commands."""

from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from custom_components.occupied.device_states import project_devices, state_effects
from custom_components.occupied.planner import ResolvedAction
from custom_components.occupied.validation import validate_program


def action(service, data=None, entity="remote.harmony"):
    return ResolvedAction(service, (entity,), data or {})


@pytest.mark.parametrize(
    "service,data,expected",
    [
        ("fan.set_percentage", {"percentage": 0}, {"percentage": 0, "_state": "off"}),
        ("fan.turn_on", {"percentage": 40}, {"percentage": 40, "_state": "on"}),
        ("lock.lock", {}, {"_state": "locked"}),
        ("select.select_option", {"option": "Home"}, {"_state": "Home"}),
        (
            "climate.set_temperature",
            {"temperature": 22, "hvac_mode": "heat"},
            {"temperature": 22, "_state": "heat"},
        ),
        ("media_player.volume_set", {"volume_level": 0.4}, {"volume_level": 0.4}),
        ("valve.set_valve_position", {"position": 50}, {"current_position": 50}),
    ],
)
def test_absolute_setters_have_observable_postconditions(service, data, expected):
    entity = service.split(".")[0] + ".proof"
    assert state_effects(action(service, data, entity), entity) == expected
    assert state_effects(action(service, data | {"unknown_option": True}, entity), entity) is None


@pytest.mark.parametrize(
    "service",
    [
        "remote.toggle",
        "remote.send_command",
        "script.turn_on",
        "scene.turn_on",
        "media_player.media_next_track",
    ],
)
def test_relative_and_opaque_calls_are_not_states(service):
    entity = service.split(".")[0] + ".proof"
    assert state_effects(action(service, entity=entity), entity) is None


def project(actions):
    at = datetime(2026, 10, 13, 18, tzinfo=UTC)
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Devices",
            "steps": {
                f"step_{i}": {
                    "timing": {"absolute_time": {"start": "17:00"}},
                    "action": a.action,
                    "entities": list(a.targets),
                    "data": a.data,
                }
                for i, a in enumerate(actions)
            },
        }
    )
    plan = SimpleNamespace(
        events=[SimpleNamespace(at=at, superseded=False, action=a) for a in actions]
    )
    return project_devices(program, plan, at)


def test_remote_latest_activity_off_and_opaque_invalidation():
    first = action("remote.turn_on", {"activity": "Watch TV"})
    second = action("remote.turn_on", {"activity": "Music"})
    assert project([first, second])["remote.harmony"][-1].data == {"activity": "Music"}
    off = action("remote.turn_off")
    assert [a.action for a in project([first, off])["remote.harmony"]] == ["remote.turn_off"]
    assert project([first, action("remote.send_command", {"command": "PowerToggle"})]) == {}
    assert project([first, action("homeassistant.turn_off")])["remote.harmony"][-1].data == {}


def test_multi_property_setters_retain_independent_intent():
    entity = "climate.room"
    calls = [
        action("climate.set_temperature", {"temperature": 22, "hvac_mode": "heat"}, entity),
        action("climate.set_hvac_mode", {"hvac_mode": "cool"}, entity),
    ]
    result = project(calls)[entity]
    assert [a.data for a in result] == [{"temperature": 22}, {"hvac_mode": "cool"}]


def test_playback_pause_does_not_replay_previous_media():
    entity = "media_player.tv"
    calls = [
        action(
            "media_player.play_media",
            {"media_content_id": "movie", "media_content_type": "video"},
            entity,
        ),
        action("media_player.media_pause", entity=entity),
    ]
    assert [a.action for a in project(calls)[entity]] == ["media_player.media_pause"]


def test_homeassistant_power_actions_restore_mixed_domains():
    from datetime import timedelta

    from custom_components.occupied.reconciliation import expected_actions

    at = datetime(2026, 10, 13, 18, tzinfo=UTC)
    targets = ("light.room", "switch.plug", "remote.harmony", "input_boolean.away")
    program = validate_program(
        {
            "schema_version": 1,
            "name": "Mixed",
            "steps": {
                "on": {
                    "timing": {"absolute_time": {"start": "17:00"}},
                    "action": "homeassistant.turn_on",
                    "entities": list(targets),
                }
            },
        }
    )
    call = ResolvedAction("homeassistant.turn_on", targets, {})
    plan = SimpleNamespace(
        start=at - timedelta(hours=18),
        end=at + timedelta(hours=6),
        events=[SimpleNamespace(at=at, superseded=False, action=call)],
    )
    result = expected_actions(program, plan, at)
    assert set(result) == set(targets)
    assert result["light.room"][0].action == "light.turn_on"
    assert result["switch.plug"][0].action == "switch.turn_on"
    assert "remote.harmony" not in expected_actions(program, plan, at, yielded={"remote.harmony"})
    plan.events[0].superseded = True
    assert expected_actions(program, plan, at) == {}
