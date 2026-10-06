"""Native HA state predicates, with unresolved dependencies failing closed."""

from collections.abc import Callable, Mapping
from types import SimpleNamespace
from typing import Any

import voluptuous as vol
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant
from homeassistant.helpers import condition
from homeassistant.helpers import config_validation as cv


def validate_conditions(conditions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Limit native condition syntax to state predicates and Boolean composition."""
    validated = [cv.CONDITION_SCHEMA(item) for item in conditions]

    def check(item: Mapping[str, Any]) -> None:
        if item["condition"] == "state":
            if "for" in item:
                raise vol.Invalid("State duration conditions are not supported")
        elif item["condition"] in {"and", "or", "not"}:
            for child in item["conditions"]:
                check(child)
        else:
            raise vol.Invalid("Only state, and, or, and not activation conditions are supported")

    for item in validated:
        check(item)
    return validated


class ActivationGate:
    """Compile HA predicates once and check dependencies before Boolean evaluation."""

    def __init__(self, hass: HomeAssistant, conditions: list[dict[str, Any]]) -> None:
        self.hass = hass
        self.conditions = validate_conditions(conditions)
        self.entities: set[str] = set()
        self.attributes: list[tuple[str, str]] = []
        self._checks: list[Callable] = []

        def collect(item: dict[str, Any]) -> None:
            if item["condition"] == "state":
                for entity_id in cv.ensure_list(item["entity_id"]):
                    self.entities.add(entity_id)
                    if attribute := item.get("attribute"):
                        self.attributes.append((entity_id, attribute))
            else:
                for child in item["conditions"]:
                    collect(child)

        for item in self.conditions:
            collect(item)

    async def async_prepare(self) -> None:
        """Build the checks through HA's own condition implementation."""
        self._checks = [
            await condition.async_from_config(self.hass, item) for item in self.conditions
        ]

    def evaluate(self, states=None) -> tuple[bool, str]:
        """Missing dependencies also block a negated condition."""
        source = self.hass if states is None else SimpleNamespace(states=states)
        for entity_id in sorted(self.entities):
            state = source.states.get(entity_id)
            if state is None or state.state in {STATE_UNKNOWN, STATE_UNAVAILABLE}:
                return False, f"Activation entity unresolved: {entity_id}"
        for entity_id, attribute in self.attributes:
            state = source.states.get(entity_id)
            if state is None or state.attributes.get(attribute) in (
                None,
                STATE_UNKNOWN,
                STATE_UNAVAILABLE,
            ):
                return False, f"Activation attribute unresolved: {entity_id}.{attribute}"
        try:
            passed = all(check(source, {}) for check in self._checks)
        except condition.ConditionError as err:
            return False, f"Activation condition failed: {err}"
        return (
            passed,
            "Activation conditions pass" if passed else "Activation conditions do not pass",
        )
