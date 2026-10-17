"""Render release compatibility from the matrix using only the standard library."""

import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def compatibility_notes(root=ROOT):
    matrix = tomllib.loads((root / "scripts/ha_matrix.toml").read_text())
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
