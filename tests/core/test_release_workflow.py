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
