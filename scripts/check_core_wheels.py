"""Report next-Python wheel readiness without treating missing wheels as a test failure."""

import argparse
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def check_wheels(version, root=ROOT):
    with tempfile.TemporaryDirectory(prefix="occupied-core-wheels-") as temporary:
        result = subprocess.run(
            [
                shutil.which("uv") or str(root / ".venv/bin/uv"),
                "pip",
                "compile",
                "pyproject.toml",
                "--group",
                "test-core",
                "--only-binary",
                ":all:",
                "--no-cache",
                "--python-version",
                version,
                "--output-file",
                str(Path(temporary) / "requirements.txt"),
            ],
            cwd=root,
            capture_output=True,
            text=True,
            check=False,
        )
    print(result.stdout, end="")
    print(result.stderr, end="")
    available = result.returncode == 0
    pending = not available and "has no usable wheels" in result.stderr
    state = "available" if available else "pending published wheels" if pending else "probe failed"
    message = f"Python {version} standalone wheels: {state}."
    if pending:
        message += " This lane remains experimental; its tests and CLI smoke still run."
        print(f"::notice::{message}")
    if summary := os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(summary).open("a") as stream:
            stream.write(message + "\n")
    if output := os.environ.get("GITHUB_OUTPUT"):
        with Path(output).open("a") as stream:
            stream.write(f"available={str(available).lower()}\n")
    return 0 if pending else result.returncode


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("python_version")
    raise SystemExit(check_wheels(parser.parse_args().python_version))
