"""Create a GUI/imported household and retain options for existing proof entries."""

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import selector

from .const import (
    CONF_ACTIVATION_ENTITY,
    CONF_ACTIVITY,
    CONF_ALLOWED_STATES,
    CONF_BRIGHTNESS,
    CONF_HANDOVER,
    CONF_LIGHT,
    CONF_LIGHT_DELAY,
    CONF_LIGHT_DURATION,
    CONF_REMOTE,
    CONF_REMOTE_DELAY,
    CONF_REMOTE_DURATION,
    DEFAULTS,
    DOMAIN,
)


def config_schema(current: dict[str, Any]) -> vol.Schema:
    """Show native selectors; times are offsets from this activation session."""
    values = DEFAULTS | current
    schema: dict = {
        vol.Required("name", default=values["name"]): str,
        vol.Required(
            CONF_LIGHT, default=values.get(CONF_LIGHT, vol.UNDEFINED)
        ): selector.EntitySelector(selector.EntitySelectorConfig(domain="light")),
        vol.Optional(
            CONF_ACTIVATION_ENTITY,
            description={"suggested_value": values.get(CONF_ACTIVATION_ENTITY, "")},
        ): selector.EntitySelector(),
        vol.Required(
            CONF_ALLOWED_STATES, default=values[CONF_ALLOWED_STATES]
        ): selector.SelectSelector(
            selector.SelectSelectorConfig(
                options=["armed", "armed_away"], multiple=True, custom_value=True
            )
        ),
        vol.Optional(
            CONF_REMOTE, description={"suggested_value": values.get(CONF_REMOTE, "")}
        ): selector.EntitySelector(selector.EntitySelectorConfig(domain="remote")),
        vol.Required(CONF_ACTIVITY, default=values[CONF_ACTIVITY]): str,
    }
    for key in (
        CONF_HANDOVER,
        CONF_LIGHT_DELAY,
        CONF_LIGHT_DURATION,
        CONF_REMOTE_DELAY,
        CONF_REMOTE_DURATION,
    ):
        schema[vol.Required(key, default=values[key])] = vol.All(
            vol.Coerce(int),
            vol.Range(
                min=0 if key in {CONF_HANDOVER, CONF_LIGHT_DELAY, CONF_REMOTE_DELAY} else 1,
                max=86400,
            ),
        )
    schema[vol.Required(CONF_BRIGHTNESS, default=values[CONF_BRIGHTNESS])] = vol.All(
        vol.Coerce(int), vol.Range(min=1, max=100)
    )
    return vol.Schema(schema)


def validate_input(data: dict[str, Any]) -> dict[str, Any]:
    """Normalize flow input and reject invalid optional gate/remote settings."""
    result = config_schema(data)(data)
    result[CONF_LIGHT] = cv.entity_domain("light")(result[CONF_LIGHT])
    for key in (CONF_ACTIVATION_ENTITY, CONF_REMOTE):
        if not result.get(key):
            result.pop(key, None)
    if entity_id := result.get(CONF_ACTIVATION_ENTITY):
        result[CONF_ACTIVATION_ENTITY] = cv.entity_id(entity_id)
        if not result[CONF_ALLOWED_STATES]:
            raise vol.Invalid("Choose at least one allowed activation state")
    if remote := result.get(CONF_REMOTE):
        result[CONF_REMOTE] = cv.entity_domain("remote")(remote)
        if not result[CONF_ACTIVITY].strip():
            raise vol.Invalid("The remote activity name cannot be empty")
    return result


class OccupiedConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Create the one supported household engine."""

    VERSION = 1

    async def async_step_import(self, user_input):
        from .file_config import load_program
        from .validation import ProgramError, program_data

        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        try:
            program = await self.hass.async_add_executor_job(load_program, user_input)
        except ProgramError:
            return self.async_abort(reason="invalid_program")
        return self.async_create_entry(
            title=program.name, data={"name": program.name, "program": program_data(program)}
        )

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            if user_input["method"] == "yaml":
                return await self.async_step_yaml()
            from .validation import program_data, validate_program

            program = validate_program({"schema_version": 1, "name": user_input["name"]})
            return self.async_create_entry(
                title=program.name, data={"name": program.name, "program": program_data(program)}
            )
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required("name", default="House"): vol.All(str, vol.Length(min=1)),
                    vol.Required("method", default="editor"): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=["editor", "yaml"],
                            translation_key="configuration_method",
                        )
                    ),
                }
            ),
        )

    async def async_step_yaml(self, user_input=None):
        from .file_config import load_program
        from .validation import ProgramError, program_data

        errors = {}
        if user_input is not None:
            try:
                program = await self.hass.async_add_executor_job(
                    load_program, user_input["program"]
                )
            except ProgramError:
                errors["base"] = "invalid_program"
            else:
                return self.async_create_entry(
                    title=program.name,
                    data={"name": program.name, "program": program_data(program)},
                )
        return self.async_show_form(
            step_id="yaml",
            errors=errors,
            data_schema=vol.Schema(
                {
                    vol.Required("program"): selector.TextSelector(
                        selector.TextSelectorConfig(multiline=True)
                    )
                }
            ),
        )

    async def async_step_proof(self, user_input=None):
        """Keep the original caller-proof configuration available for development."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        errors = {}
        if user_input is not None:
            try:
                data = validate_input(user_input)
            except vol.Invalid:
                errors["base"] = "invalid_config"
            else:
                return self.async_create_entry(title=data["name"], data=data)
        return self.async_show_form(
            step_id="proof", data_schema=config_schema(user_input or {}), errors=errors
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        return OccupiedOptionsFlow()


class OccupiedOptionsFlow(config_entries.OptionsFlow):
    """Replace caller-proof settings through a normal entry reload."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        from .storage import program_store

        if (
            self.config_entry.data.get("program")
            or await program_store(self.hass, self.config_entry.entry_id).async_load()
        ):
            return self.async_abort(reason="daily_program")
        errors = {}
        if user_input is not None:
            try:
                data = validate_input(user_input)
            except vol.Invalid:
                errors["base"] = "invalid_config"
            else:
                return self.async_create_entry(title="", data=data)
        current = self.config_entry.data | self.config_entry.options
        return self.async_show_form(
            step_id="init", data_schema=config_schema(current), errors=errors
        )
