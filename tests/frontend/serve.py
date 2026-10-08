"""Local browser fixture: production modules and real pure backend, virtual runtime.

Run: .venv/bin/python tests/frontend/serve.py
Open http://127.0.0.1:8765/tests/frontend/harness.html
This fixture does not connect to HA or control devices. HA APIs are tested separately.
"""

import json
import sys
from datetime import UTC, datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from custom_components.occupied.file_config import load_program  # noqa: E402
from custom_components.occupied.planner import generate_plan  # noqa: E402
from custom_components.occupied.preview import (  # noqa: E402
    export_draft,
    preview_draft,
    rename_draft,
    validate_draft,
)
from custom_components.occupied.time_utils import PlanningContext  # noqa: E402
from custom_components.occupied.validation import (  # noqa: E402
    ProgramError,
    program_data,
    program_revision,
)

CONTEXT = PlanningContext("Europe/Stockholm", 59.3293, 18.0686, 0)
DAY = datetime(2026, 10, 6, 18, tzinfo=UTC)


class Handler(SimpleHTTPRequestHandler):
    program = None
    plan = None
    source = {"mode": "gui", "status": "ready", "has_valid_program": True}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    @classmethod
    def reset(cls):
        cls.source = {"mode": "gui", "status": "ready", "has_valid_program": True}
        cls.program = load_program((ROOT / "examples/house.yaml").read_text())
        cls.plan = generate_plan(
            cls.program, DAY.date(), "saved-live-seed", context=CONTEXT
        ).to_dict()

    def do_POST(self):
        msg = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        cls = type(self)
        try:
            kind = msg["type"].removeprefix("occupied/")
            if kind == "test/reset":
                cls.reset()
                result = {}
            elif kind == "program":
                result = {
                    "program": program_data(cls.program),
                    "revision": program_revision(cls.program),
                    "needs_apply": False,
                    "source": cls.source["mode"],
                    "configuration_source": cls.source,
                    "simulation_date": DAY.date().isoformat(),
                    "timezone": CONTEXT.timezone,
                }
            elif kind == "status":
                result = self.status()
            elif kind == "catalog":
                result = {
                    "entities": [
                        {
                            "entity_id": e,
                            "name": e.split(".")[1].replace("_", " "),
                            "domain": e.split(".")[0],
                            "area": "Living room",
                            "state": "off",
                            "dimmable": e.startswith("light."),
                            "transition": e == "light.living_room",
                            "activities": ["Watch TV", "Listen to music"],
                        }
                        for e in [
                            "light.bedroom",
                            "light.hall",
                            "light.kitchen",
                            "light.living_room",
                            "switch.floor_lamp",
                            "remote.living_room_harmony",
                            "sensor.alarm",
                            "scene.morning",
                            "cover.blinds",
                        ]
                    ],
                    "services": {
                        "scene": {"turn_on": {"fields": {}}},
                        "cover": {"set_cover_position": {"fields": {}}},
                        "light": {"turn_on": {"fields": {}}, "turn_off": {"fields": {}}},
                        "switch": {"turn_on": {"fields": {}}, "turn_off": {"fields": {}}},
                        "remote": {
                            "turn_on": {
                                "fields": {
                                    "activity": {"name": "Activity", "selector": {"text": {}}}
                                }
                            },
                            "turn_off": {"fields": {}},
                        },
                    },
                }
            elif kind in {"validate", "editor_validate"}:
                result = {"valid": True, **validate_draft(msg["program"])}
            elif kind == "export":
                result = {"valid": True, **export_draft(msg["program"])}
            elif kind == "rename_id":
                result = {
                    "valid": True,
                    **rename_draft(msg["program"], msg["kind"], msg["old"], msg["new"]),
                }
            elif kind == "preview":
                result = preview_draft(
                    msg["program"],
                    datetime.fromisoformat(msg["date"]).date(),
                    msg["days"],
                    msg["seed"],
                    CONTEXT,
                    datetime.fromisoformat(msg["at"]) if msg.get("at") else None,
                )
            elif kind == "save":
                if cls.source["mode"] == "file":
                    raise ValueError("The managed file is authoritative")
                if msg["expected_revision"] != program_revision(cls.program):
                    return self.respond(
                        {
                            "error": {
                                "code": "revision_conflict",
                                "message": "The saved program changed",
                            }
                        }
                    )
                cls.program = load_program(msg["program"])
                result = {
                    "valid": True,
                    "program": program_data(cls.program),
                    "revision": program_revision(cls.program),
                }
            elif kind == "source":
                if msg["expected_revision"] != program_revision(cls.program):
                    return self.respond(
                        {"error": {"code": "revision_conflict", "message": "The program changed"}}
                    )
                cls.source = {
                    "mode": msg["source"],
                    "status": "ready",
                    "has_valid_program": True,
                    "read_only": msg["source"] == "file",
                    "config_file": msg.get("config_file"),
                }
                result = {
                    "valid": True,
                    "program": program_data(cls.program),
                    "revision": program_revision(cls.program),
                    "source": cls.source["mode"],
                    "configuration_source": cls.source,
                }
            elif kind == "reload":
                result = {"valid": cls.source["status"] == "ready", "changed": False, **cls.source}
            elif kind == "test/file-error":
                cls.source = {
                    **cls.source,
                    "status": "error",
                    "issues": [
                        {
                            "code": "yaml_syntax",
                            "message": "Invalid virtual file",
                            "path": "$",
                            "line": 3,
                        }
                    ],
                }
                result = self.status()
            elif kind == "timeline":
                result = {
                    "snapshot": self.status(),
                    "dates": [DAY.date().isoformat()],
                    "plan": cls.plan,
                    "events": [
                        e
                        | {
                            "outcome": "historical_skipped"
                            if e["time"] < DAY.isoformat()
                            else "scheduled"
                        }
                        for e in cls.plan["events"]
                    ],
                    "issues": cls.plan["issues"],
                }
            elif kind == "diagnostics":
                result = {
                    "counts": {"active_activities": 0},
                    "status": self.status() if msg.get("include_sensitive") else {"mode": "daily"},
                }
            else:
                raise ValueError(f"Unknown fixture command {kind}")
            self.respond(result)
        except ProgramError as error:
            self.respond({"valid": False, "issues": [issue.to_dict() for issue in error.issues]})
        except ValueError as error:
            self.respond({"error": {"message": str(error)}})

    def status(self):
        return {
            "name": type(self).program.name,
            "mode": "daily",
            "configuration_source": type(self).source,
            "enabled": False,
            "active": False,
            "status": "disabled",
            "reason": "Permission disabled",
            "dry_run": False,
            "paused": False,
            "source_revision": program_revision(type(self).program),
            "activities": [],
            "handover": {},
            "events": [],
            "outcomes": [],
            "yielded": [],
        }

    def respond(self, result):
        body = json.dumps(result).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    Handler.reset()
    print("Occupied browser fixture: http://127.0.0.1:8765/tests/frontend/harness.html", flush=True)
    HTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
