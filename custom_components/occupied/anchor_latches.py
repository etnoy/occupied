"""Keep reached HA time anchors for the remainder of their local date."""

from dataclasses import replace
from datetime import UTC, datetime, time
from zoneinfo import ZoneInfo

from .models import program_timings
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
                    self.records[value["entity"], value["attribute"]] = dict(value)
            except KeyError, TypeError, ValueError:
                continue

    def snapshot(self):
        return {"timezone": self.timezone, "records": list(self.records.values())}

    def apply(self, program, context, now):
        try:
            zone = ZoneInfo(context.timezone or "")
        except ValueError, KeyError:
            return context
        today = now.astimezone(zone).date()
        fields = source_fields(program)
        previous = self.snapshot()
        if self.timezone != context.timezone:
            self.records.clear()
        self.timezone = context.timezone
        self.records = {
            key: value
            for key, value in self.records.items()
            if value.get("date") == today.isoformat() and key[1] in fields.get(key[0], ())
        }
        latched = {}
        for entity, attributes in fields.items():
            source = context.time_sources.get(entity, {})
            for attribute in sorted(attributes):
                key = entity, attribute
                record = self.records.get(key)
                if record and source.get("kind") not in {None, record.get("kind")}:
                    self.records.pop(key)
                    record = None
                # The source can advance directly to tomorrow. Promote the last
                # observed candidate before considering that replacement value.
                if record and datetime.fromisoformat(record["instant"]) <= now:
                    record = record | {"latched": True}
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
                if record["latched"]:
                    latched.setdefault(entity, {"kind": record["kind"]})[attribute] = record[
                        "value"
                    ]
        if previous != self.snapshot():
            self.version += 1
        return replace(context, time_source_latches={today.isoformat(): latched} if latched else {})

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
        except ValueError, TypeError:
            return None
