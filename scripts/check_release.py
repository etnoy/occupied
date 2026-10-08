"""Verify canonical schema, examples, metadata and shipped assets before packaging."""

import json
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from custom_components.occupied.file_config import (  # noqa: E402
    export_yaml,
    load_yaml,
    read_program,
)
from custom_components.occupied.models import Program  # noqa: E402
from custom_components.occupied.validation import behavior_hash  # noqa: E402

integration = ROOT / "custom_components" / "occupied"
manifest = json.loads((integration / "manifest.json").read_text())
project = tomllib.loads((ROOT / "pyproject.toml").read_text())["project"]
assert manifest["version"] == project["version"]
assert manifest["domain"] == "occupied" and manifest["single_config_entry"]
assert manifest["codeowners"] == ["@etnoy"]
assert manifest["documentation"].startswith("https://github.com/etnoy/occupied")
assert manifest["issue_tracker"] == "https://github.com/etnoy/occupied/issues"
schema = json.loads((ROOT / "schema" / "occupied.schema.json").read_text())
assert schema == Program.model_json_schema(), "Regenerate schema/occupied.schema.json"
for name in ("house.yaml", "gui-house.yaml"):
    program = read_program(ROOT / "examples" / name)
    assert behavior_hash(load_yaml(export_yaml(program))) == behavior_hash(program)
assert {path.name for path in (integration / "frontend").glob("*.js")} == {
    "occupied-panel.js",
    "forms.js",
    "model.js",
    "routine-model.js",
    "routines.js",
    "styles.js",
    "timeline.js",
    "translations.js",
    "views.js",
}, "Missing or unexpected frontend assets"
for name in ("icon.png", "icon@2x.png"):
    assert (integration / "brand" / name).read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
for path in integration.rglob("*.json"):
    json.loads(path.read_text())
hacs = json.loads((ROOT / "hacs.json").read_text())
assert hacs["name"] == "Occupied" and not hacs.get("hide_default_branch", False)
assert not hacs.get("zip_release")
print(f"Release {manifest['version']}: metadata, schema, equivalent examples and assets verified")
