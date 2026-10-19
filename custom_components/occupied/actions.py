"""Capability-aware HA service preparation and conservative observations."""

import asyncio
import logging

from homeassistant.components.light import LightEntityFeature
from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN

from .light_tolerances import attribute_matches
from .lighting import LightState

SERVICE_TIMEOUT = 10
_LOGGER = logging.getLogger(__name__)


class ServiceWaitTimeout(TimeoutError):
    """The caller stopped waiting while the native handler may still be running."""


async def dispatch_service(hass, action, context, *, data=None, on_late_result=None):
    """Await native handlers with a bound; callers own authorization and journaling."""
    domain, service = action.action.split(".")
    data = service_payload(hass, action) if data is None else data

    async def call_native():
        try:
            await hass.services.async_call(domain, service, data, blocking=True, context=context)
        except Exception as error:
            # Python 3.14's shield logs late exceptions itself. Return the
            # failure so our waiter or completion callback can handle it once.
            return error
        return None

    task = hass.async_create_task(
        call_native(),
        name=f"Occupied service {action.action}",
    )

    def completed(call_task):
        target = ", ".join(action.targets)
        error = asyncio.CancelledError() if call_task.cancelled() else call_task.result()
        if call_task.cancelled():
            _LOGGER.warning(
                "Occupied service %s for %s (context %s) was cancelled "
                "after its caller stopped waiting",
                action.action,
                target,
                context.id,
            )
        elif error is not None:
            _LOGGER.warning(
                "Occupied service %s for %s (context %s) failed "
                "after its caller stopped waiting: %s: %s",
                action.action,
                target,
                context.id,
                type(error).__name__,
                error,
            )
        else:
            _LOGGER.info(
                "Occupied service %s for %s (context %s) completed "
                "after its caller stopped waiting",
                action.action,
                target,
                context.id,
            )

        if on_late_result is not None:
            on_late_result(error)

    try:
        failure = await asyncio.wait_for(asyncio.shield(task), SERVICE_TIMEOUT)
    except TimeoutError as error:
        task.add_done_callback(completed)
        raise ServiceWaitTimeout(
            f"Service handler did not finish within {SERVICE_TIMEOUT:g}s; completion is uncertain"
        ) from error
    except asyncio.CancelledError:
        task.add_done_callback(completed)
        raise
    if failure is not None:
        # Keep native failures, including their own TimeoutError, distinct from
        # the bound on how long Occupied waits for an unfinished handler.
        raise failure
    return data


def observe(hass, entity):
    state = hass.states.get(entity)
    if state is None or state.state in {STATE_UNKNOWN, STATE_UNAVAILABLE}:
        return None
    # Observe attributes relevant to ownership, rather than volatile telemetry.
    return {
        "state": state.state,
        "attributes": {
            key: list(state.attributes[key])
            if isinstance(state.attributes[key], tuple)
            else state.attributes[key]
            for key in (
                "brightness",
                "color_temp_kelvin",
                "hs_color",
                "rgb_color",
                "current_activity",
                "media_content_id",
                "media_content_type",
                "source",
                "current_position",
                "current_tilt_position",
            )
            if key in state.attributes
        },
    }


def light_observation(hass, entity):
    value = observe(hass, entity)
    if value is None or value["state"] not in {STATE_ON, STATE_OFF}:
        return None
    attrs = value["attributes"]
    # HA includes null attributes when a light is off or its active color mode
    # does not supply them. Preserve unknown values rather than converting None.
    return LightState(
        value["state"],
        attrs["brightness"] * 100 / 255
        if value["state"] == STATE_ON and attrs.get("brightness") is not None
        else 0
        if value["state"] == STATE_OFF
        else None,
        attrs.get("color_temp_kelvin"),
        tuple(attrs["hs_color"]) if attrs.get("hs_color") is not None else None,
        tuple(attrs["rgb_color"]) if attrs.get("rgb_color") is not None else None,
    )


def light_capabilities(hass, entity):
    state = hass.states.get(entity)
    modes = set(state.attributes.get("supported_color_modes", ())) if state else set()
    return (
        bool(modes - {"onoff", "unknown"}),
        bool(
            state and state.attributes.get("supported_features", 0) & LightEntityFeature.TRANSITION
        ),
    )


def light_matches(hass, entity, target):
    current = light_observation(hass, entity)
    if current is None or current.state != target.state:
        return False
    if target.state == "off":
        return True
    from .planner import ResolvedAction

    data = target.to_dict()
    data.pop("state")
    action = ResolvedAction("light.turn_on", (entity,), data, (entity,), True)
    data = service_payload(hass, action)
    return all(
        attribute_matches(key, getattr(current, key), data[key])
        for key in ("brightness_pct", "color_temp_kelvin", "hs_color", "rgb_color")
        if key in data
    )


def service_payload(hass, action):
    data = dict(action.data)
    if action.targets:
        data["entity_id"] = list(action.targets) if len(action.targets) > 1 else action.targets[0]
    if action.action in {"light.turn_on", "light.turn_off"} and action.targets:
        entity = action.targets[0]
        dimmable, transition = light_capabilities(hass, entity)
        if not dimmable:
            for key in (
                "brightness",
                "brightness_pct",
                "transition",
                "color_temp_kelvin",
                "hs_color",
                "rgb_color",
            ):
                data.pop(key, None)
        elif not transition:
            data.pop("transition", None)
        state = hass.states.get(entity)
        modes = set(state.attributes.get("supported_color_modes", ())) if state else set()
        if "color_temp" not in modes:
            data.pop("color_temp_kelvin", None)
        if not modes & {"hs", "rgb", "rgbw", "rgbww", "xy"}:
            data.pop("hs_color", None)
            data.pop("rgb_color", None)
    return data
