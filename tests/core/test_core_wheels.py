"""Expected next-Python wheel gaps are distinct from broken tests or resolver failures."""

import subprocess

import pytest

from scripts import check_core_wheels


@pytest.mark.parametrize(
    "code,error,expected,status,available",
    [
        (0, "", 0, "available", "true"),
        (1, "Because pyyaml==6.0.3 has no usable wheels", 0, "pending published wheels", "false"),
        (1, "TLS certificate verification failed", 1, "probe failed", "false"),
        (2, "No solution found: dependency version conflict", 2, "probe failed", "false"),
    ],
)
def test_wheel_probe_reports_readiness_without_hiding_unexpected_failures(
    monkeypatch, tmp_path, code, error, expected, status, available
):
    summary, output = tmp_path / "summary.md", tmp_path / "outputs"
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    monkeypatch.setenv("GITHUB_OUTPUT", str(output))
    commands = []

    def resolver(command, **kwargs):
        commands.append(command)
        return subprocess.CompletedProcess(command, code, stdout="", stderr=error)

    monkeypatch.setattr(check_core_wheels.subprocess, "run", resolver)
    assert check_core_wheels.check_wheels("3.15", tmp_path) == expected
    assert status in summary.read_text()
    assert output.read_text() == f"available={available}\n"
    assert "--no-cache" in commands[0] and ":all:" in commands[0]
