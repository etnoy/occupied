"""Known desired states at an instant, without replaying historical actions."""

from .covers import project_covers
from .lighting import project_lighting
from .models import controlled_entities
from .planner import ResolvedAction


def project_switches(program, plan, at, *, yielded=frozenset()):
    switches = {
        entity for entity in controlled_entities(program) - yielded if entity.startswith("switch.")
    }
    states = {}
    for event in plan.events:
        if event.at > at:
            break
        if event.superseded:
            continue
        for entity in switches.intersection(event.action.targets):
            if event.action.action in {"switch.turn_on", "switch.turn_off"}:
                states[entity] = event.action.action.removeprefix("switch.turn_")
            else:
                states.pop(entity, None)
    return states


def expected_actions(program, plan, at, *, yielded=frozenset()):
    """Return direct target calls only for explicitly known, supported intent."""
    actions = {}
    for entity, target in project_lighting(program, plan, at, yielded=yielded).items():
        data = target.to_dict() if target.state == "on" else {}
        data.pop("state", None)
        actions[entity] = [
            ResolvedAction(f"light.turn_{target.state}", (entity,), data, (entity,), True)
        ]
    for entity, state in project_switches(program, plan, at, yielded=yielded).items():
        actions[entity] = [ResolvedAction(f"switch.turn_{state}", (entity,), {}, (entity,), True)]
    for entity, target in project_covers(program, plan, at, yielded=yielded).items():
        actions[entity] = []
        for axis, value in target.to_dict().items():
            if value in {0, 100}:
                command = "open" if value == 100 else "close"
                suffix = "_tilt" if axis == "tilt_position" else ""
                service, data = f"cover.{command}_cover{suffix}", {}
            else:
                service, data = f"cover.set_cover_{axis}", {axis: value}
            actions[entity].append(ResolvedAction(service, (entity,), data, (entity,), False))
    return actions
