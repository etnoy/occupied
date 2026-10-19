"""Fail early on inconsistent release metadata and classify canonical PEP 440 tags."""

import argparse
import json
import tomllib
from pathlib import Path

from packaging.version import InvalidVersion, Version

ROOT = Path(__file__).resolve().parents[1]


def validate_release(tag, root=ROOT):
    project = tomllib.loads((root / "pyproject.toml").read_text())["project"]["version"]
    manifest = json.loads((root / "custom_components/occupied/manifest.json").read_text())[
        "version"
    ]
    if project != manifest:
        raise ValueError(f"Release metadata differs: pyproject {project}, manifest {manifest}")
    try:
        version = Version(project)
    except InvalidVersion as err:
        raise ValueError(f"Release version is not PEP 440: {project}") from err
    if str(version) != project:
        raise ValueError(f"Use the canonical PEP 440 version {version}, not {project}")
    if tag != f"v{project}":
        raise ValueError(f"Release tag must be v{project}, got {tag}")
    return {"version": project, "prerelease": version.is_prerelease}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tag")
    args = parser.parse_args()
    try:
        result = validate_release(args.tag)
    except (KeyError, ValueError) as err:
        parser.error(str(err))
    print(f"version={result['version']}")
    print(f"prerelease={str(result['prerelease']).lower()}")


if __name__ == "__main__":
    main()
