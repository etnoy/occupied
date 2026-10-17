"""Exercise dynamic candidate isolation and the failure-reporting contract."""

import json
import subprocess
import tomllib
from pathlib import Path

import pytest
import yaml

from scripts import ha_next
from scripts import report_ha_compat as reporting

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def candidate():
    return {
        "available": True,
        "homeassistant": "2026.11.0b0",
        "python": "3.15.3",
        "requires_python": "3.15.2",
        "phcc": "0.13.380",
        "fallback_phcc": "0.13.373",
        "frontend": "20261015.1",
        "image": "ghcr.io/home-assistant/home-assistant:2026.11.0b0",
        "stable_lag_days": 15,
        "stale": True,
    }


def test_current_matrix_does_not_install_or_fetch(monkeypatch, tmp_path):
    def unexpected(*args):
        pytest.fail("A current matrix must not fetch or install anything")

    monkeypatch.setattr(ha_next.matrix, "fetch_text", unexpected)
    monkeypatch.setattr(ha_next.matrix, "run", unexpected)
    ha_next.run_candidate({"available": False}, tmp_path)
    assert list(tmp_path.iterdir()) == []


def test_missing_fixture_fails_before_install(candidate, tmp_path):
    candidate.update(phcc=None, fallback_phcc=None)
    with pytest.raises(ValueError, match="No matching or fallback"):
        ha_next.run_candidate(candidate, tmp_path)
    assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize("matching", [True, False])
def test_candidate_uses_its_python_constraints_and_discloses_fallback(
    candidate, matching, monkeypatch, tmp_path, capsys
):
    if not matching:
        candidate["phcc"] = None
    (tmp_path / "pyproject.toml").write_text((ROOT / "pyproject.toml").read_text())
    monkeypatch.setattr(ha_next.matrix, "load", lambda _: ({}, []))
    monkeypatch.setattr(ha_next.matrix, "uv", lambda: "uv")
    monkeypatch.setattr(ha_next.matrix, "fetch_text", lambda _: "pydantic==2.14.0\n")
    commands = []

    def run(command, root, **kwargs):
        commands.append([str(part) for part in command])
        if command[1:3] == ["pip", "compile"]:
            metadata = tomllib.loads(Path(command[3]).read_text())
            assert (
                metadata["tool"]["uv"]["dependency-groups"]["dev"]["requires-python"] == ">=3.15.2"
            )
            assert command[command.index("--python-version") + 1] == "3.15.3"
            overrides = Path(command[command.index("--overrides") + 1]).read_text()
            assert "homeassistant==2026.11.0b0" in overrides
            assert ("0.13.380" if matching else "0.13.373") in overrides
            constraints = Path(command[command.index("--constraint") + 1])
            assert constraints.read_text() == "pydantic==2.14.0\n"
            Path(command[command.index("--output-file") + 1]).write_text(
                f"pydantic==2.14.0\n# via {command[3]}\n"
            )
        if "pytest" in command:
            assert command[-1] == "-x"
            assert "tests/ha" in command
            assert kwargs["env"]["PATH"].startswith(str(command[0].parent))

    fallback_checks = []
    monkeypatch.setattr(ha_next.matrix, "run", run)
    monkeypatch.setattr(
        ha_next.subprocess, "run", lambda *args, **kwargs: fallback_checks.append((args, kwargs))
    )
    ha_next.run_candidate(candidate, tmp_path, pytest_args=("-x",))
    assert any(command[1:3] == ["venv", "--python"] for command in commands)
    assert any("check" in command for command in commands) == matching
    assert bool(fallback_checks) != matching
    assert ("No matching fixture" in capsys.readouterr().out) != matching
    artifacts = tmp_path / "test-results/ha-next"
    assert json.loads((artifacts / "candidate.json").read_text()) == candidate
    requirements = (artifacts / "requirements.txt").read_text()
    assert "unhashed" in requirements and "occupied-next-" not in requirements


def test_matching_fixture_dependency_failure_is_not_hidden(candidate, monkeypatch, tmp_path):
    (tmp_path / "pyproject.toml").write_text((ROOT / "pyproject.toml").read_text())
    monkeypatch.setattr(ha_next.matrix, "load", lambda _: ({}, []))
    monkeypatch.setattr(ha_next.matrix, "fetch_text", lambda _: "pydantic==2.14.0\n")

    def run(command, *args, **kwargs):
        if "--output-file" in command:
            Path(command[command.index("--output-file") + 1]).write_text("pydantic==2.14.0\n")
        if "check" in command:
            raise subprocess.CalledProcessError(1, command)

    monkeypatch.setattr(ha_next.matrix, "run", run)
    with pytest.raises(subprocess.CalledProcessError):
        ha_next.run_candidate(candidate, tmp_path)


def test_success_and_skips_do_not_touch_github(monkeypatch):
    monkeypatch.setattr(reporting, "gh", lambda *args: pytest.fail("No issue expected"))
    assert reporting.report({}, {"python-next": {"result": "success"}}, "url") is None
    assert reporting.report({}, {"python-next": {"result": "skipped"}}, "url") is None


@pytest.mark.parametrize("existing", [True, False])
def test_failure_updates_one_managed_section_preserving_human_notes(
    candidate, existing, monkeypatch
):
    calls = []
    bodies = []

    def gh(*args):
        calls.append(args)
        if args[:2] == ("issue", "list"):
            return json.dumps(
                [
                    {"number": 4, "title": "Unrelated compatibility issue", "body": "Leave me"},
                    {
                        "number": 8,
                        "title": reporting.TITLE,
                        "body": "Human investigation\n\n"
                        + reporting.START
                        + "\nOld run\n"
                        + reporting.END
                        + "\nHuman conclusion",
                    },
                ]
                if existing
                else []
            )
        if args[:2] == ("label", "list"):
            return "[]"
        if "--body-file" in args:
            bodies.append(Path(args[args.index("--body-file") + 1]).read_text())
            return "https://github.com/example/repo/issues/8"
        return ""

    monkeypatch.setattr(reporting, "gh", gh)
    reporting.report(candidate, {"python-next": {"result": "failure"}}, "https://example/run/1")
    assert len(bodies) == 1
    assert bodies[0].count(reporting.START) == 1
    assert "2026.11.0b0" in bodies[0] and "15 days" in bodies[0]
    assert "https://example/run/1" in bodies[0]
    assert "Old run" not in bodies[0]
    if existing:
        assert bodies[0].startswith("Human investigation\n\n")
        assert bodies[0].endswith("Human conclusion\n")
        assert calls[-1][:3] == ("issue", "edit", "8")
        assert not any(call[0] == "label" for call in calls)
    else:
        assert calls[-1][:2] == ("issue", "create")
        assert sum(call[:2] == ("label", "create") for call in calls) == 1


def test_canary_is_separate_from_required_pr_ci_and_only_report_can_write_issues():
    workflow = yaml.load(
        (ROOT / ".github/workflows/ha-next.yml").read_text(), Loader=yaml.BaseLoader
    )
    assert set(workflow["on"]) == {"schedule", "workflow_dispatch"}
    assert workflow["permissions"] == {"contents": "read"}
    jobs = workflow["jobs"]
    assert jobs["report"]["permissions"]["issues"] == "write"
    assert not any("permissions" in job for name, job in jobs.items() if name != "report")
    assert jobs["python-next"]["needs"] == jobs["browser-next"]["needs"] == "discover"
    assert "freshness" in jobs["report"]["needs"]
