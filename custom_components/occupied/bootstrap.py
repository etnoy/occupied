"""Stable managed-instance identities and non-destructive YAML bootstrap."""

from homeassistant.core import callback
from homeassistant.helpers import issue_registry as ir

from .const import DOMAIN


def declarations(config):
    if not config:
        return []
    if "config_file" in config:
        return [{"config_file": config["config_file"]}]
    return config["instances"]


def unique_id(declaration):
    return f"instance:{declaration['id']}" if "id" in declaration else DOMAIN


def existing_entry(hass, declaration):
    entries = hass.config_entries.async_entries(DOMAIN)
    identity = unique_id(declaration)
    if entry := next((entry for entry in entries if entry.unique_id == identity), None):
        return entry
    # Preserve the original entry and its stores when assigning a stable YAML ID.
    if "id" in declaration:
        return next(
            (
                entry
                for entry in entries
                if entry.unique_id == DOMAIN
                and entry.data.get("source") == "file"
                and entry.data.get("config_file") == declaration["config_file"]
            ),
            None,
        )
    return entries[0] if len(entries) == 1 else None


@callback
def check_bootstrap(hass, entry, config):
    declaration = next(
        (item for item in declarations(config) if existing_entry(hass, item) is entry), None
    )
    issue_id = f"source_conflict_{entry.entry_id}"
    if declaration and (
        entry.data.get("source") != "file"
        or entry.data.get("config_file") != declaration["config_file"]
    ):
        ir.async_create_issue(
            hass,
            DOMAIN,
            issue_id,
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key="source_conflict",
            translation_placeholders={"name": entry.title},
        )
    else:
        ir.async_delete_issue(hass, DOMAIN, issue_id)


async def async_bootstrap(hass, config):
    for declaration in declarations(config):
        await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": "import"}, data=declaration
        )
