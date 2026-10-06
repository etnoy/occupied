"""Diagnostics omit household details unless explicitly requested by an admin."""

from homeassistant.components.diagnostics import REDACTED


def _credentials_redacted(value):
    secrets = set()
    keys = {
        "token",
        "accesstoken",
        "refreshtoken",
        "password",
        "secret",
        "apikey",
        "authorization",
        "credentials",
        "clientsecret",
    }

    def sensitive(key):
        return key.lower().replace("_", "").replace("-", "") in keys

    def collect(item):
        if isinstance(item, dict):
            for key, child in item.items():
                if sensitive(key) and isinstance(child, str) and child:
                    secrets.add(child)
                collect(child)
        elif isinstance(item, (list, tuple)):
            for child in item:
                collect(child)

    def redact(item):
        if isinstance(item, dict):
            return {
                key: REDACTED if sensitive(key) else redact(child) for key, child in item.items()
            }
        if isinstance(item, (list, tuple)):
            return [redact(child) for child in item]
        if isinstance(item, str):
            for secret in secrets:
                item = item.replace(secret, REDACTED)
        return item

    collect(value)
    return redact(value)


def diagnostics_data(engine, *, include_sensitive=False):
    snapshot = engine.snapshot()
    result = {
        key: snapshot[key]
        for key in (
            "mode",
            "enabled",
            "paused",
            "dry_run",
            "active",
            "status",
            "session",
            "next_event",
            "handover_deadline",
            "source_revision",
            "behavior_hash",
            "journal_count",
        )
        if key in snapshot
    }
    result["counts"] = {
        "queued_events": len(snapshot["events"]),
        "recent_outcomes": len(snapshot["outcomes"]),
        "active_activities": len(snapshot.get("activities", [])),
        "handover_targets": len(snapshot.get("handover", {})),
        "yielded_targets": len(snapshot.get("yielded", [])),
    }
    if include_sensitive:
        result["status"] = snapshot
        if hasattr(engine, "_plans"):
            result["plans"] = [plan.to_dict() for plan in engine._plans.values()]
            result["journal"] = dict(engine._journal)
    return _credentials_redacted(result)


async def async_get_config_entry_diagnostics(hass, entry):
    return diagnostics_data(entry.runtime_data)
