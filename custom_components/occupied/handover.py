"""Pure bounded fade/step/stagger construction from observed lighting."""

import hashlib
import math
from dataclasses import dataclass
from datetime import datetime, timedelta

from .lighting import LightState
from .models import Handover

MAX_STEPS = 256


@dataclass(frozen=True)
class HandoverCall:
    at: datetime
    service: str
    data: dict
    native: bool = False


def calls_for_target(
    entity,
    observed: LightState,
    target: LightState,
    start: datetime,
    deadline: datetime,
    config: Handover,
    *,
    dimmable: bool,
    native_transition: bool,
) -> tuple[HandoverCall, ...]:
    duration = max(0, (deadline - start).total_seconds())
    if observed == target:
        return ()
    data = target.to_dict()
    data.pop("state")
    data.pop("brightness_pct", None)
    finish = round((target.brightness_pct or 0) * 255 / 100) if target.state == "on" else 0
    initial = round((observed.brightness_pct or 100) * 255 / 100) if observed.state == "on" else 0
    service = "turn_on" if target.state == "on" else "turn_off"
    if not dimmable:
        # Stable staggering avoids a whole-house simultaneous on/off edge.
        fraction = int.from_bytes(hashlib.sha256(entity.encode()).digest()[:8]) / (2**64 - 1)
        at = start + timedelta(seconds=duration * (0.5 + fraction / 2))
        return (HandoverCall(at, service, {}),)
    if native_transition and config.dimming == "auto" and duration:
        payload = data | {"transition": duration}
        if finish:
            payload["brightness"] = max(1, finish)
        return (
            HandoverCall(start, service, payload if finish else {"transition": duration}, True),
        )
    count = min(MAX_STEPS, max(1, math.ceil(duration / config.step_interval)))
    return tuple(
        HandoverCall(
            start + timedelta(seconds=duration * index / count),
            "turn_off" if not finish and index == count else "turn_on",
            {}
            if not finish and index == count
            else data
            | {
                "brightness": max(1, round(initial + (finish - initial) * index / count)),
                "transition": 0,
            },
        )
        for index in range(1, count + 1)
    )
