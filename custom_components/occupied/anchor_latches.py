"""Keep reached HA time anchors while their source dates remain in the runtime window."""

from dataclasses import replace
from datetime import UTC, datetime, time
from zoneinfo import ZoneInfo

from .models import program_timings
from .runtime_planning import runtime_dates
from .time_utils import resolve_local


def source_fields(program):
    fields = {}
    for _, timing in program_timings(program):
        if (source := timing.relative_to) and source.entity:
            fields.setdefault(source.entity, set()).add(source.attribute or "state")
    return fields


class AnchorLatches:
    """Remember candidates before their instant; only reached values become latches."""

    def __init__(self):
        self.records = {}
        self.timezone = None
        self.version = self.persisted_version = 0

    @property
    def dirty(self):
        return self.version != self.persisted_version

    def restore(self, saved):
        if not isinstance(saved, dict):
            return
        self.timezone = saved.get("timezone")
        for value in saved.get("records", []):
            if not isinstance(value, dict):
                continue
            try:
                at = datetime.fromisoformat(value["instant"])
                if at.tzinfo and isinstance(value["value"], str):
                    self.records[value["date"], value["entity"], value["attribute"]] = dict(value)
            except (KeyError, TypeError, ValueError):
                continue

    def snapshot(self):
        return {"timezone": self.timezone, "records": list(self.records.values())}

    def apply(self, program, context, now):
        try:
            zone = ZoneInfo(context.timezone or "")
        except (ValueError, KeyError):
            return context
        today = now.astimezone(zone).date()
        dates = {day.isoformat() for day in runtime_dates(program, today)}
        fields = source_fields(program)
        previous = self.snapshot()
        if self.timezone != context.timezone:
            self.records.clear()
        self.timezone = context.timezone
        self.records = {
            key: value
            for key, value in self.records.items()
            if key[0] in dates
            and key[2] in fields.get(key[1], ())
            and context.time_sources.get(key[1], {}).get("kind") in {None, value.get("kind")}
        }
        # Promote retained candidates even when the first refresh after their
        # instant is on a later date (including after a restart).
        self.records = {
            key: record | {"latched": True}
            if datetime.fromisoformat(record["instant"]) <= now
            else record
            for key, record in self.records.items()
        }
        for entity, attributes in fields.items():
            source = context.time_sources.get(entity, {})
            for attribute in sorted(attributes):
                key = today.isoformat(), entity, attribute
                record = self.records.get(key)
                if not record or not record.get("latched"):
                    value = source.get(attribute)
                    at = self._instant(value, source.get("kind"), attribute, today, zone)
                    if at is None or at.astimezone(zone).date() != today:
                        self.records.pop(key, None)
                        continue
                    record = {
                        "entity": entity,
                        "attribute": attribute,
                        "value": value,
                        "kind": source.get("kind"),
                        "instant": at.isoformat(),
                        "date": today.isoformat(),
                        "latched": at <= now,
                    }
                self.records[key] = record
        latched = {}
        for (day, entity, attribute), record in self.records.items():
            if record["latched"]:
                latched.setdefault(day, {}).setdefault(entity, {"kind": record["kind"]})[
                    attribute
                ] = record["value"]
        if previous != self.snapshot():
            self.version += 1
        return replace(context, time_source_latches=latched)

    @staticmethod
    def _instant(value, kind, attribute, today, zone):
        try:
            if not value or value in {"unknown", "unavailable"}:
                return None
            if kind == "time" and attribute == "state":
                return resolve_local(datetime.combine(today, time.fromisoformat(value)), zone)[0]
            at = datetime.fromisoformat(value)
            if at.tzinfo is None and attribute != "state":
                at = resolve_local(at, zone)[0]
            return at.astimezone(UTC) if at.tzinfo else None
        except (ValueError, TypeError):
            return None
