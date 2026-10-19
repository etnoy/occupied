"""Bad tags fail before verification; canonical prereleases stay prereleases."""

import json
from pathlib import Path

import pytest
import yaml

from scripts.release_preflight import validate_release

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def release_repo(tmp_path):
    def metadata(project="0.1.1", manifest=None):
        integration = tmp_path / "custom_components/occupied"
        integration.mkdir(parents=True, exist_ok=True)
        (integration / "manifest.json").write_text(json.dumps({"version": manifest or project}))
        (tmp_path / "pyproject.toml").write_text(f'[project]\nversion = "{project}"\n')
        return tmp_path

    return metadata


@pytest.mark.parametrize(
    "version,prerelease",
    [
        ("0.1.1", False),
        ("0.2.0rc1", True),
        ("0.2.0b2", True),
        ("0.2.0a1", True),
        ("0.2.0.dev1", True),
        ("0.1.1.post1", False),
    ],
)
def test_canonical_release_classification(release_repo, version, prerelease):
    assert validate_release(f"v{version}", release_repo(version)) == {
        "version": version,
        "prerelease": prerelease,
    }


@pytest.mark.parametrize(
    "project,manifest,tag",
    [
        ("0.1.1", "0.1.0", "v0.1.1"),
        ("0.1.1", "0.1.1", "v0.1.0"),
        ("0.1.1", "0.1.1", "0.1.1"),
        ("0.2.0-rc.1", "0.2.0-rc.1", "v0.2.0-rc.1"),
        ("invalid", "invalid", "vinvalid"),
    ],
)
def test_inconsistent_or_noncanonical_tags_are_rejected(release_repo, project, manifest, tag):
    with pytest.raises(ValueError):
        validate_release(tag, release_repo(project, manifest))


def test_preflight_gates_verification_and_publish_classification():
    jobs = yaml.safe_load((ROOT / ".github/workflows/release.yml").read_text())["jobs"]
    assert jobs["verify"]["needs"] == "preflight"
    assert "preflight" in jobs["publish"]["needs"]
    preflight = jobs["preflight"]
    assert any("scripts/release_preflight.py" in step.get("run", "") for step in preflight["steps"])
    publish = next(
        step for step in jobs["publish"]["steps"] if "gh release create " in step.get("run", "")
    )
    assert publish["env"]["RELEASE_PRERELEASE"] == "${{ needs.preflight.outputs.prerelease }}"
    assert "$RELEASE_PRERELEASE" in publish["run"]
