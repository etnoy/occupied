"""Run an unhashed, isolated probe of a dynamically discovered Home Assistant release."""

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from . import ha_matrix as matrix


def run_candidate(candidate, root=matrix.ROOT, pytest_args=()):
    if not candidate.get("available"):
        print("The supported matrix is current; no next-HA candidate to test")
        return
    fixture = candidate.get("phcc") or candidate.get("fallback_phcc")
    if not fixture:
        raise ValueError("No matching or fallback HA test fixture is available")
    lane = matrix.Lane(
        "next",
        "next",
        candidate["homeassistant"],
        fixture,
        candidate["frontend"],
        candidate["python"],
        candidate["image"],
        python_min=candidate["requires_python"],
    )
    policy, _ = matrix.load(root)
    official = matrix.fetch_text(
        f"https://raw.githubusercontent.com/home-assistant/core/{lane.homeassistant}/homeassistant/package_constraints.txt"
    )
    security = matrix.security_pins(policy, matrix.pins(official))
    results = root / "test-results/ha-next"
    results.mkdir(parents=True, exist_ok=True)
    (results / "candidate.constraints").write_text(official)
    (results / "candidate.json").write_text(json.dumps(candidate, indent=2) + "\n")
    with tempfile.TemporaryDirectory(prefix="occupied-next-") as temporary:
        directory = Path(temporary)
        project = directory / "pyproject.toml"
        project.write_text(
            matrix.with_dev_python((root / "pyproject.toml").read_text(), lane.python_min)
        )
        overrides = directory / "next.overrides"
        overrides.write_text(matrix.overrides(lane, security))
        constraints = directory / "next.constraints"
        constraints.write_text(matrix.patched_constraints(official, security))
        requirements = results / "requirements.txt"
        matrix.run(
            [
                matrix.uv(),
                "pip",
                "compile",
                project,
                "--group",
                f"{project}:dev",
                "--overrides",
                overrides,
                "--constraint",
                constraints,
                "--python-version",
                lane.python,
                "--universal",
                "--no-header",
                "--output-file",
                requirements,
            ],
            root,
        )
        source = requirements.read_text().replace(str(project), "pyproject.toml")
        source = source.replace(str(constraints), "candidate.constraints")
        source = source.replace(str(overrides), "candidate.overrides")
        requirements.write_text(
            "# Dynamic HA canary; unhashed, outside the supported matrix\n" + source
        )
        (results / "candidate.overrides").write_text(overrides.read_text())
        environment = directory / "venv"
        interpreter = (
            sys.executable
            if lane.python == ".".join(map(str, sys.version_info[:3]))
            else lane.python
        )
        matrix.run([matrix.uv(), "venv", "--python", interpreter, environment], root)
        python = environment / "bin/python"
        matrix.run([matrix.uv(), "pip", "sync", "--python", python, requirements], root)
        matrix.run(
            [matrix.uv(), "pip", "install", "--python", python, "--no-deps", "-e", "."], root
        )
        if candidate.get("phcc"):
            matrix.run([matrix.uv(), "pip", "check", "--python", python], root)
        else:
            print(
                f"No matching fixture yet: probing with {fixture}; "
                "its HA bound is intentionally overridden"
            )
            subprocess.run(
                [matrix.uv(), "pip", "check", "--python", str(python)], cwd=root, check=False
            )
        variables = os.environ | {
            "PATH": str(environment / "bin") + os.pathsep + os.environ["PATH"]
        }
        matrix.run(
            [
                python,
                "-m",
                "pytest",
                "tests/ha",
                f"--junitxml={results / 'python.xml'}",
                *pytest_args,
            ],
            root,
            env=variables,
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("pytest_args", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    try:
        run_candidate(json.loads(args.candidate.read_text()), pytest_args=args.pytest_args)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"{error}\n")
