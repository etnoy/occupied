"""Authenticated editor documents, installed-action checks, and actual plan views."""

import hashlib
import json
from datetime import timedelta

import voluptuous as vol
from homeassistant.helpers import area_registry, device_registry, entity_registry
from homeassistant.helpers.service import async_get_all_descriptions
from homeassistant.util import dt as dt_util

from .actions import light_capabilities, service_payload
from .models import merge_defaults
from .planner import ResolvedAction
from .time_sources import planning_context, time_source_options
from .time_utils import simulation_date_at
from .validation import (
    Issue,
    behavior_hash,
    program_data,
    program_revision,
    resolve_targets,
    validate_program,
)


def starter_program(config):
    """Offer an editable daily draft using the proof's selected entities and gate."""
    light = config.get("light_entity")
    target = {"groups": ["home_lights"]} if light else {"entities": []}
    raw = {
        "schema_version": 1,
        "name": config.get("name", "House"),
        "groups": [{"id": "home_lights", "name": "Home lights", "entities": [light]}]
        if light
        else [],
        "activation": {"conditions": []},
        "lighting": {
            "managed_targets": target,
            "baseline": [{"targets": target, "state": "off"}] if light else [],
        },
        "routines": [
            {
                "id": "evening",
                "name": "Evening",
                "steps": [
                    {
                        "id": "evening_on",
                        "name": "Evening lights",
                        "when": {"clock_range": {"earliest": "18:00", "latest": "18:30"}},
                        "actions": [
                            {"action": "turn_on", "targets": target, "data": {"brightness_pct": 70}}
                        ],
                    },
                    {
                        "id": "bedtime",
                        "name": "Bedtime",
                        "when": {"clock_range": {"earliest": "22:30", "latest": "23:00"}},
                        "actions": [{"action": "safety_off", "targets": target}],
                    },
                ]
                if light
                else [],
                "activities": [],
            }
        ],
    }
    if entity := config.get("activation_entity"):
        raw["activation"]["conditions"] = [
            {"condition": "state", "entity_id": entity, "state": config["allowed_states"]}
        ]
    if remote := config.get("remote_entity"):
        activity = config.get("remote_activity", "Watch TV")
        remote_target = {"entities": [remote]}
        raw["routines"][0]["activities"].append(
            {
                "id": "evening_tv",
                "name": "Evening television",
                "when": {"clock_range": {"earliest": "19:45", "latest": "20:15"}},
                "duration": {"fixed": "45m"},
                "resources": [remote],
                "start_conditions": [{"condition": "state", "entity_id": remote, "state": "off"}],
                "on_start": [
                    {
                        "action": "remote.turn_on",
                        "targets": remote_target,
                        "data": {"activity": activity},
                    }
                ],
                "on_end": [{"action": "remote.turn_off", "targets": remote_target}],
                "ownership_conditions": [
                    {
                        "condition": "state",
                        "entity_id": remote,
                        "attribute": "current_activity",
                        "state": activity,
                    }
                ],
            }
        )
    return validate_program(raw)


def current_revision(engine):
    if hasattr(engine, "program"):
        return program_revision(engine.program)
    return "proof:" + hashlib.sha256(json.dumps(engine.config, sort_keys=True).encode()).hexdigest()


def program_document(engine):
    program = engine.program if hasattr(engine, "program") else starter_program(engine.config)
    context = planning_context(engine.hass)
    return {
        "program": program_data(program),
        "revision": current_revision(engine),
        "behavior_hash": behavior_hash(program),
        "source": engine.source_manager.mode if getattr(engine, "source_manager", None) else "gui",
        "configuration_source": engine.source_manager.snapshot()
        if getattr(engine, "source_manager", None)
        else {"mode": "gui", "status": "ready"},
        "needs_apply": not hasattr(engine, "program"),
        "simulation_date": simulation_date_at(program, dt_util.utcnow(), context).isoformat(),
        "timezone": program.timezone if program.timezone != "home_assistant" else context.timezone,
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
                "activities": list(state.attributes.get("activity_list", [])),
            }
        )
    return {
        "entities": result,
        "services": await async_get_all_descriptions(hass),
        "time_sources": time_source_options(hass),
    }


def installed_issues(hass, program):
    """Inspect registered schemas/availability without ever calling a service."""
    issues = []
    registry = hass.services.async_services()
    for ri, routine in enumerate(program.routines):
        defaults = merge_defaults(program, routine)
        for kind, items in (("steps", routine.steps), ("activities", routine.activities)):
            for ii, item in enumerate(items):
                fields = ("actions",) if kind == "steps" else ("on_start", "on_end")
                for field in fields:
                    for ai, action in enumerate(getattr(item, field)):
                        path = ("routines", ri, kind, ii, field, ai)
                        targets = resolve_targets(program, action.targets)
                        qualified = "." in action.action
                        service_name = (
                            "turn_off" if action.action == "safety_off" else action.action
                        )
                        names = (
                            [action.action]
                            if qualified
                            else sorted({f"{e.split('.')[0]}.{service_name}" for e in targets})
                        )
                        for entity in targets:
                            state = hass.states.get(entity)
                            if state is None or state.state in {"unknown", "unavailable"}:
                                issues.append(
                                    Issue(
                                        "entity_unavailable",
                                        f"{entity} is unresolved; runtime will skip it",
                                        path + ("targets",),
                                        "warning",
                                    )
                                )
                        for name in names:
                            domain, service = name.split(".")
                            registered = registry.get(domain, {}).get(service)
                            if registered is None:
                                issues.append(
                                    Issue(
                                        "service_missing",
                                        f"{name} is not currently registered",
                                        path + ("action",),
                                        "warning",
                                    )
                                )
                                continue
                            selected = (
                                targets
                                if qualified
                                else tuple(e for e in targets if e.startswith(domain + "."))
                            )
                            stagger = action.stagger or defaults.stagger
                            batches = (
                                [(e,) for e in selected]
                                if domain in {"light", "switch"} or stagger.upper > 0
                                else [selected]
                            )
                            for batch in batches:
                                resolved = ResolvedAction(
                                    name, tuple(batch), dict(action.data), action.resources
                                )
                                try:
                                    if registered.schema:
                                        registered.schema(service_payload(hass, resolved))
                                except vol.Invalid as err:
                                    issues.append(
                                        Issue("service_data", f"{name}: {err}", path + ("data",))
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
    end_indices = {}
    if plan:
        for event in plan.events:
            journal = engine._journal.get(engine._key(plan, event), {})
            actual_time = None
            if event.kind == "activity_end":
                index = end_indices.get(event.source_id, 0)
                end_indices[event.source_id] = index + 1
                mode = "dry" if engine.dry_run else "live"
                lifecycle_id = (
                    f"{mode}:{plan.behavior_hash}:{plan.simulation_date}:activity:{event.source_id}"
                )
                journal = engine._journal.get(f"{lifecycle_id}:end:{index}", {})
                if lifecycle := engine._activities.get(lifecycle_id):
                    if lifecycle.deadline:
                        actual_time = (
                            lifecycle.deadline + timedelta(seconds=lifecycle.end_actions[index][0])
                        ).isoformat()
            events.append(
                event.to_dict()
                | {
                    "outcome": journal.get(
                        "status",
                        "scheduled"
                        if event.at >= dt_util.utcnow() or actual_time
                        else "not_dispatched",
                    ),
                    "dispatch_time": journal.get("time"),
                    "actual_time": actual_time,
                }
            )
    return {
        "snapshot": snapshot,
        "dates": [day.isoformat() for day in dates],
        "plan": plan.to_dict() if plan else None,
        "events": events,
        "issues": [issue.to_dict() for issue in plan.issues] if plan else [],
    }
