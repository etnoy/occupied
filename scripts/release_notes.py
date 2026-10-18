"""Render release compatibility from the matrix."""

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def compatibility_notes(root=ROOT):
    workflow = yaml.safe_load((root / ".github/workflows/check.yml").read_text())
    matrix = workflow["jobs"]["matrix"]["strategy"]["matrix"]["include"][0]
    floor = next(lane for lane in matrix["lanes"] if lane["role"] == "floor")
    newest = next(lane for lane in matrix["lanes"] if lane["role"] == "newest")
    newest_minor = ".".join(newest["homeassistant"].split(".")[:2])
    policy = matrix["policy"]
    return (
        f"Supports Home Assistant {floor['homeassistant']}–{newest_minor}.x. "
        f"The standalone CLI requires Python {policy['python_floor']} or newer; "
        f"Python {policy['python_next']} support is experimental."
    )


if __name__ == "__main__":
    print(compatibility_notes())
