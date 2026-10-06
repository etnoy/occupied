"""Immutable start/end snapshots; never infer a generic action's inverse."""

from dataclasses import dataclass, field
from datetime import datetime

from .planner import ResolvedAction
from .storage import action_from_data, instant


@dataclass
class ActivityLifecycle:
    id: str
    source_id: str
    resources: tuple[str, ...]
    duration: float
    end_actions: tuple[tuple[float, ResolvedAction], ...]
    ownership_conditions: list[dict]
    stop_behavior: str
    pending_starts: set[str]
    phase: str = "starting"
    deadline: datetime | None = None
    observed: dict = field(default_factory=dict)
    contexts: set[str] = field(default_factory=set)
    completed_ends: set[int] = field(default_factory=set)
    dry_run: bool = False
    acquired: set[str] = field(default_factory=set)
    desired_states: dict = field(default_factory=dict)

    def to_dict(self):
        return {
            "id": self.id,
            "source_id": self.source_id,
            "resources": list(self.resources),
            "duration": self.duration,
            "end_actions": [
                {"offset": offset, "action": action.to_dict()}
                for offset, action in self.end_actions
            ],
            "ownership_conditions": self.ownership_conditions,
            "stop_behavior": self.stop_behavior,
            "pending_starts": sorted(self.pending_starts),
            "phase": self.phase,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "observed": self.observed,
            "contexts": sorted(self.contexts),
            "completed_ends": sorted(self.completed_ends),
            "dry_run": self.dry_run,
            "acquired": sorted(self.acquired),
            "desired_states": self.desired_states,
        }

    @classmethod
    def from_dict(cls, data):
        if data["phase"] not in {"starting", "confirming", "running", "ending"}:
            raise ValueError("Invalid saved activity phase")
        if not 0 < data["duration"] <= 7 * 86400 or not data["resources"]:
            raise ValueError("Invalid saved activity duration/resources")
        actions = tuple(
            (float(item["offset"]), action_from_data(item["action"]))
            for item in data["end_actions"]
        )
        if not actions or any(not 0 <= offset <= 7 * 86400 for offset, _ in actions):
            raise ValueError("Invalid saved end actions")
        return cls(
            data["id"],
            data["source_id"],
            tuple(data["resources"]),
            data["duration"],
            actions,
            data["ownership_conditions"],
            data["stop_behavior"],
            set(data["pending_starts"]),
            data["phase"],
            instant(data["deadline"]) if data["deadline"] else None,
            data["observed"],
            set(data["contexts"]),
            set(data["completed_ends"]),
            data["dry_run"],
            set(data.get("acquired", data["observed"])),
            data.get("desired_states", {}),
        )
