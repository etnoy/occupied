"""Regenerate the published JSON schema from the canonical program models."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from custom_components.occupied.models import Program  # noqa: E402


def main():
    path = ROOT / "schema" / "occupied.schema.json"
    path.write_text(json.dumps(Program.model_json_schema(), indent=2))
    print(f"Generated {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
