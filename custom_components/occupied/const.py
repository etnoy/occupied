"""Constants for the initial caller-proof integration."""

from homeassistant.const import Platform

DOMAIN = "occupied"
PLATFORMS = (Platform.SWITCH, Platform.SENSOR)
SUPPORTED_HA_VERSION = "2026.9.4"
PANEL_URL = "/occupied_static/occupied-panel.js"
SIGNAL_PREFIX = "occupied_updated"
CONF_LIGHT = "light_entity"
CONF_ACTIVATION_ENTITY = "activation_entity"
CONF_ALLOWED_STATES = "allowed_states"
CONF_REMOTE = "remote_entity"
CONF_ACTIVITY = "remote_activity"
CONF_HANDOVER = "handover_seconds"
CONF_BRIGHTNESS = "brightness_pct"
CONF_LIGHT_DELAY = "light_delay_seconds"
CONF_LIGHT_DURATION = "light_duration_seconds"
CONF_REMOTE_DELAY = "remote_delay_seconds"
CONF_REMOTE_DURATION = "remote_duration_seconds"

DEFAULTS = {
    "name": "House",
    CONF_ALLOWED_STATES: ["armed", "armed_away"],
    CONF_HANDOVER: 600,
    CONF_BRIGHTNESS: 70,
    CONF_LIGHT_DELAY: 60,
    CONF_LIGHT_DURATION: 120,
    CONF_REMOTE_DELAY: 90,
    CONF_REMOTE_DURATION: 2700,
    CONF_ACTIVITY: "Watch TV",
}
