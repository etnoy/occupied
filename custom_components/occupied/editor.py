"""Authenticated editor documents, installed-action checks, and actual plan views."""

import hashlib
import json

import voluptuous as vol
from homeassistant.helpers import area_registry, device_registry, entity_registry
from homeassistant.helpers.service import async_get_all_descriptions
from homeassistant.util import dt as dt_util

from .actions import light_capabilities, service_payload
from .models import program_actions
from .planner import resolve_actions
from .time_sources import planning_context, time_source_options
from .time_utils import simulation_date_at
from .validation import (
    Issue,
    behavior_hash,
    program_data,
    program_revision,
    validate_program,
    validation_warnings,
)


def starter_program(config):
    steps = {}
    if light := config.get("light_entity"):
        steps = {
            "evening_on": {
                "name": "Evening lights",
                "timing": {"absolute_time": {"start": "18:00", "end": "18:30"}},
                "action": "turn_on",
                "entities": [light],
            },
            "bedtime": {
                "name": "Bedtime",
                "timing": {"absolute_time": {"start": "22:30", "end": "23:00"}},
                "action": "turn_off",
                "entities": [light],
            },
        }
    return validate_program(
        {"schema_version": 1, "name": config.get("name", "Occupied"), "steps": steps}
    )


def current_revision(engine):
    if hasattr(engine, "program"):
        return getattr(engine, "source_revision", None) or program_revision(engine.program)
    return "proof:" + hashlib.sha256(json.dumps(engine.config, sort_keys=True).encode()).hexdigest()


def program_document(engine):
    program = engine.program if hasattr(engine, "program") else starter_program(engine.config)
    context = planning_context(engine.hass)
    return {
        "program": program_data(program),
        "recovery_yaml": engine.source_manager.recovery["yaml"]
        if getattr(engine, "source_manager", None) and engine.source_manager.recovery
        else None,
        "warnings": [
            issue.to_dict()
            for issue in (*validation_warnings(program), *installed_issues(engine.hass, program))
            if issue.severity == "warning"
        ],
        "revision": current_revision(engine),
        "behavior_hash": behavior_hash(program),
        "source": engine.source_manager.mode if getattr(engine, "source_manager", None) else "gui",
        "configuration_source": engine.source_manager.snapshot()
        if getattr(engine, "source_manager", None)
        else {"mode": "gui", "status": "ready"},
        "needs_apply": not hasattr(engine, "program"),
        "simulation_date": simulation_date_at(program, dt_util.utcnow(), context).isoformat(),
        "timezone": context.timezone,
    }


async def async_catalog(hass):
    entities = entity_registry.async_get(hass)
    devices = device_registry.async_get(hass)
    areas = area_registry.async_get(hass)
    result = []
    for state in sorted(hass.states.async_all(), key=lambda state: state.entity_id):
        entry = entities.async_get(state.entity_id)
        device = devices.async_get(entry.device_id) if entry and entry.device_id else None
        area_id = (entry.area_id if entry else None) or (device.area_id if device else None)
        area = areas.async_get_area(area_id) if area_id else None
        dimmable, transition = light_capabilities(hass, state.entity_id)
        result.append(
            {
                "entity_id": state.entity_id,
                "name": state.name,
                "state": state.state,
                "area": area.name if area else None,
                "domain": state.domain,
                "dimmable": dimmable,
                "transition": transition,
                "color_modes": list(state.attributes.get("supported_color_modes", [])),
                "options": list(state.attributes.get("options", [])),
                "activity_list": list(state.attributes.get("activity_list", [])),
            }
        )
    return {
        "entities": result,
        "services": await async_get_all_descriptions(hass),
        "time_sources": time_source_options(hass),
    }


def installed_issues(hass, program):
    """Validate installed services without dispatching them."""
    issues = []
    registry = hass.services.async_services()
    for path, step in program_actions(program, enabled_only=False):
        for entity in step.entities:
            state = hass.states.get(entity)
            if state is None or state.state in {"unknown", "unavailable"}:
                issues.append(
                    Issue(
                        "entity_unavailable",
                        f"Unresolved entity: {entity}",
                        path + ("entities",),
                        "warning",
                    )
                )
        for action in resolve_actions(step):
            issues.extend(_remote_activity_issues(hass, path, action))
            domain, service = action.action.split(".")
            registered = registry.get(domain, {}).get(service)
            if registered is None:
                issues.append(
                    Issue(
                        "service_missing",
                        f"{action.action} is not currently registered",
                        path + ("action",),
                        "warning",
                    )
                )
                continue
            try:
                if registered.schema is not None:
                    registered.schema(service_payload(hass, action))
            except vol.Invalid as err:
                issues.append(Issue("service_data", f"{action.action}: {err}", path + ("data",)))
                continue
            issues.extend(_generic_turn_issues(registry, path, action))
    return issues


def _generic_turn_issues(registry, path, action):
    """Check the per-domain calls made by HA's generic turn services."""
    if action.action not in {
        "homeassistant.turn_on",
        "homeassistant.turn_off",
        "homeassistant.toggle",
    }:
        return []
    service = action.action.split(".")[1]
    targets = {}
    for entity in sorted(action.targets):
        domain = entity.split(".")[0]
        if domain != "homeassistant":
            targets.setdefault(domain, []).append(entity)
    issues = []
    for domain, entities in targets.items():
        registered = registry.get(domain, {}).get(service)
        if registered is None:
            issues.append(
                Issue(
                    "service_unsupported_entities",
                    f"{action.action} does nothing for {', '.join(entities)}",
                    path + ("entities",),
                    "warning",
                )
            )
        elif registered.schema is not None:
            try:
                registered.schema({**action.data, "entity_id": entities})
            except vol.Invalid as err:
                issues.append(
                    Issue(
                        "service_data",
                        f"{action.action} → {domain}.{service}: {err}",
                        path + ("data",),
                    )
                )
    return issues


def _remote_activity_issues(hass, path, action):
    """Advisory check for activity remotes which accept unknown names silently."""
    if action.action not in {"remote.turn_on", "homeassistant.turn_on", "homeassistant.toggle"}:
        return []
    activity = action.data.get("activity")
    if not isinstance(activity, str) or not activity or activity.isdecimal():
        return []
    issues = []
    for entity in action.targets:
        if not entity.startswith("remote."):
            continue
        state = hass.states.get(entity)
        if state is None or state.state in {"unknown", "unavailable"}:
            continue
        activities = state.attributes.get("activity_list")
        if not isinstance(activities, (list, tuple)):
            continue
        names = [name for name in activities if isinstance(name, str)]
        if activity.casefold() not in {name.casefold() for name in names}:
            issues.append(
                Issue(
                    "remote_activity_unknown",
                    f"Activity {activity!r} is not listed for {entity}. "
                    f"Valid activities: {', '.join(names)}",
                    path + ("data",),
                    "warning",
                )
            )
    return issues


def timeline_document(engine, selected_date=None):
    snapshot = engine.snapshot()
    if not hasattr(engine, "_plans"):
        return {"snapshot": snapshot, "dates": [], "plan": None, "events": [], "issues": []}
    dates = sorted(engine._plans)
    day = selected_date or simulation_date_at(engine.program, dt_util.utcnow(), engine._context())
    plan = engine._plans.get(day)
    events = []
    if plan:
        for event in plan.events:
            journal = engine._journal.get(engine._key(plan, event), {})
            events.append(
                event.to_dict()
                | {
                    "outcome": journal.get(
                        "status", "pending" if event.at >= dt_util.utcnow() else "not_dispatched"
                    ),
                    "dispatch_time": journal.get("time"),
                    "actual_time": None,
                }
            )
    return {
        "snapshot": snapshot,
        "dates": [d.isoformat() for d in dates],
        "plan": plan.to_dict() if plan else None,
        "events": events,
        "issues": [i.to_dict() for i in plan.issues] if plan else [],
    }
