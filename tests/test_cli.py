"""CLI validates/exports replacements and previews without HA or source mutation."""

import json
import subprocess
import sys
from copy import deepcopy

import pytest
import yaml

from custom_components.occupied.cli import main
from custom_components.occupied.file_config import load_yaml


@pytest.fixture
def program_file(tmp_path, program_dict):
    path = tmp_path / "house.yaml"
    path.write_text(yaml.safe_dump(program_dict, sort_keys=False), encoding="utf-8")
    return path


def test_cli_validate_and_week_preview_are_read_only(program_file, capsys):
    original = program_file.read_bytes()
    assert main(["validate", str(program_file), "--json"]) == 0
    validation = json.loads(capsys.readouterr().out)
    assert validation["valid"]
    args = ["preview", str(program_file), "--date", "2026-10-06", "--days", "7", "--seed", "proof"]
    assert main(args) == 0
    first = json.loads(capsys.readouterr().out)
    assert len(first["plans"]) == 7
    assert main(args) == 0
    assert json.loads(capsys.readouterr().out) == first
    assert program_file.read_bytes() == original


def test_cli_rename_emits_replacement_and_leaves_source_intact(program_file, capsys):
    original = program_file.read_bytes()
    assert main(["rename-id", str(program_file), "step", "wake", "morning"]) == 0
    replacement = load_yaml(capsys.readouterr().out)
    assert replacement.routines[0].steps[1].when.relative_to == "morning"
    assert program_file.read_bytes() == original


def test_cli_output_and_projected_handover(program_file, tmp_path):
    output = tmp_path / "preview.json"
    assert (
        main(
            [
                "preview",
                str(program_file),
                "--date",
                "2026-10-06",
                "--seed",
                "proof",
                "--at",
                "2026-10-06T06:55:00Z",
                "--handover-at",
                "2026-10-06T06:55:00Z",
                "--output",
                str(output),
            ]
        )
        == 0
    )
    result = json.loads(output.read_text())
    assert "lighting" in result and "handover" in result
    assert result["handover"]["targets"]


def test_cli_invalid_file_and_infeasible_day_fail_with_diagnostics(
    program_file, program_dict, capsys
):
    program_file.write_text("schema_version: 1\nname: House\nname: Duplicate\n")
    assert main(["validate", str(program_file), "--json"]) == 2
    result = json.loads(capsys.readouterr().err)
    assert result["issues"][0]["line"] == 3
    changed = deepcopy(program_dict)
    changed["routines"][0]["activity_windows"][0]["on_duration"] = {"fixed": "5h"}
    program_file.write_text(yaml.safe_dump(changed))
    assert main(["validate", str(program_file), "--date", "2026-10-06", "--json"]) == 2
    result = json.loads(capsys.readouterr().out)
    assert not result["valid"]


@pytest.mark.parametrize(
    "at, expected",
    [("2026-10-05T23:30:00+00:00", "2026-10-05"), ("2026-10-06T00:30:00+00:00", "2026-10-06")],
)
def test_today_uses_program_timezone_and_simulation_day(
    program_file, program_dict, freezer, capsys, at, expected
):
    freezer.move_to(at)
    program_dict["timezone"] = "Europe/Stockholm"
    program_file.write_text(yaml.safe_dump(program_dict))
    assert main(["validate", str(program_file), "--date", "today", "--json"]) == 0
    result = json.loads(capsys.readouterr().out)
    assert result["plans"][0]["simulation_date"] == expected


def test_cli_import_path_does_not_import_home_assistant(program_file):
    script = (
        "import sys; from custom_components.occupied.cli import main; "
        "assert not any(k == 'homeassistant' or k.startswith('homeassistant.') "
        "for k in sys.modules); raise SystemExit(main(sys.argv[1:]))"
    )
    result = subprocess.run(
        [sys.executable, "-c", script, "validate", str(program_file), "--json"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["valid"]
