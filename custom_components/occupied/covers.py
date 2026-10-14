"""Project authored cover targets without inventing travel or stopped positions."""

from dataclasses import asdict, dataclass
from datetime import UTC

from .validation import Issue, ProgramError

COVER_ACTIONS = frozenset(
    f"cover.{service}"
    for service in (
        "open_cover",
        "close_cover",
        "stop_cover",
        "set_cover_position",
        "open_cover_tilt",
        "close_cover_tilt",
        "stop_cover_tilt",
        "set_cover_tilt_position",
    )
)


@dataclass(frozen=True)
class CoverPosition:
    position: int | None = None
    tilt_position: int | None = None

    def to_dict(self):
        return {key: value for key, value in asdict(self).items() if value is not None}


def cover_target(action, previous=None):
    """Stop invalidates its axis; opaque calls invalidate both explicit axes."""
    if action.action not in COVER_ACTIONS:
        return CoverPosition()
    field = (
        "position"
        if action.action == "cover.set_cover_position"
        else "tilt_position"
        if action.action == "cover.set_cover_tilt_position"
        else None
    )
    if any(key != field for key in action.data):
        return CoverPosition()
    values = (previous or CoverPosition()).to_dict()
    axis = "tilt_position" if "tilt" in action.action else "position"
    if action.action.startswith("cover.stop_"):
        values.pop(axis, None)
    elif action.action.startswith("cover.open_"):
        values[axis] = 100
    elif action.action.startswith("cover.close_"):
        values[axis] = 0
    else:
        value = action.data.get(axis)
        if (
            not isinstance(value, bool)
            and isinstance(value, (int, float))
            and 0 <= value <= 100
            and value == int(value)
        ):
            values[axis] = int(value)
        else:
            return CoverPosition()
    return CoverPosition(**values)


def project_covers(program, plan, instant, *, yielded=frozenset()):
    """Preview only; covers always skip historical calls on late activation."""
    if instant.tzinfo is None:
        raise ProgramError([Issue("naive_projection", "Use a timezone-aware instant")])
    instant = instant.astimezone(UTC)
    if not plan.start <= instant <= plan.end:
        raise ProgramError(
            [Issue("projection_day", "Supply the plan covering the projection instant")]
        )
    from .models import controlled_entities

    covers = {
        entity for entity in controlled_entities(program) - yielded if entity.startswith("cover.")
    }
    states = {}
    for event in plan.events:
        if event.at > instant:
            break
        for entity in covers.intersection(event.action.targets):
            target = cover_target(event.action, states.get(entity))
            if target.to_dict():
                states[entity] = target
            else:
                states.pop(entity, None)
    return states
