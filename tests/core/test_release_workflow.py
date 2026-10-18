"""Every release-notes file referenced by the publish command must be shipped."""

import json
import shlex
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]


def test_release_notes_inputs_exist():
    manifest = json.loads((ROOT / "custom_components/occupied/manifest.json").read_text())
    workflow = yaml.safe_load((ROOT / ".github/workflows/release.yml").read_text())
    commands = [
        shlex.split(line.strip())
        for step in workflow["jobs"]["publish"]["steps"]
        for line in step.get("run", "").splitlines()
        if line.strip().startswith("gh release create ")
    ]
    assert commands, "The release workflow must publish its installable assets"
    for command in commands:
        if "--notes-file" in command:
            source = command[command.index("--notes-file") + 1]
            source = source.replace("${RELEASE_TAG#v}", manifest["version"])
            assert (ROOT / source).is_file(), f"Release notes input is missing: {source}"


def test_release_notes_include_matrix_compatibility():
    workflow = yaml.safe_load((ROOT / ".github/workflows/release.yml").read_text())
    publish = workflow["jobs"]["publish"]["steps"]
    commands = [
        shlex.split(line.strip())
        for step in publish
        for line in step.get("run", "").splitlines()
        if line.strip().startswith("gh release create ")
    ]
    assert commands and all("--notes" in command for command in commands), (
        "Every release must prepend compatibility notes generated from the HA matrix"
    )
    assert any("scripts/release_notes.py" in step.get("run", "") for step in publish)
    for step in publish:
        if "gh release create " in step.get("run", ""):
            assert "COMPATIBILITY_NOTES" in step["env"]
            for line in step["run"].splitlines():
                if "gh release create " in line:
                    command = shlex.split(line)
                    assert command[command.index("--notes") + 1] == "$COMPATIBILITY_NOTES"


def test_compatibility_notes_follow_the_matrix(tmp_path):
    from scripts.release_notes import compatibility_notes

    directory = tmp_path / ".github/workflows"
    directory.mkdir(parents=True)
    data = {
        "policy": {"python_floor": "3.15.2", "python_next": "3.16"},
        "lanes": [
            {"role": "floor", "homeassistant": "2027.6.0"},
            {"role": "newest", "homeassistant": "2027.11.3"},
        ],
    }
    (directory / "check.yml").write_text(
        yaml.safe_dump({"jobs": {"matrix": {"strategy": {"matrix": {"include": [data]}}}}})
    )
    assert compatibility_notes(tmp_path) == (
        "Supports Home Assistant 2027.6.0–2027.11.x. "
        "The standalone CLI requires Python 3.15.2 or newer; "
        "Python 3.16 support is experimental."
    )
