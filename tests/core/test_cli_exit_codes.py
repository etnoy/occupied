"""CLI callers can distinguish input/transport failures from invalid programs."""

import pytest
import yaml

from custom_components.occupied.cli import main


@pytest.fixture
def source(tmp_path, program_dict):
    path = tmp_path / "program.yaml"
    path.write_text(yaml.safe_dump(program_dict), encoding="utf-8")
    return path


@pytest.mark.parametrize("argv", [[], ["unknown"], ["validate"], ["--unknown"]])
def test_usage_errors_exit_one_with_usage(argv, capsys):
    with pytest.raises(SystemExit) as raised:
        main(argv)
    assert raised.value.code == 1
    assert "usage: occupied" in capsys.readouterr().err


@pytest.mark.parametrize("problem", ["missing", "encoding"])
def test_input_read_errors_exit_one(tmp_path, capsys, problem):
    path = tmp_path / "input.yaml"
    if problem == "encoding":
        path.write_bytes(b"\xff")
    assert main(["validate", str(path), "--json"]) == 1
    assert "file_read" in capsys.readouterr().err


def test_output_write_errors_exit_one(source, tmp_path, capsys):
    assert main(["export", str(source), "--output", str(tmp_path)]) == 1
    assert capsys.readouterr().err


@pytest.mark.parametrize(
    "options",
    [
        ["--days", "0", "--timezone", "UTC"],
        ["--days", "32", "--timezone", "UTC"],
        [],
        ["--timezone", "Not/A_Timezone"],
        ["--timezone", "UTC", "--latitude", "59"],
    ],
)
def test_preview_context_and_range_errors_exit_one(source, capsys, options):
    assert main(["preview", str(source), "--date", "2026-10-13", "--seed", "status", *options]) == 1
    assert capsys.readouterr().err


def test_missing_solar_context_is_usage_error(source, program_dict, capsys):
    program_dict["steps"]["wake"]["timing"] = {"relative_to": {"sun": "sunrise"}}
    source.write_text(yaml.safe_dump(program_dict), encoding="utf-8")
    assert (
        main(
            [
                "preview",
                str(source),
                "--date",
                "2026-10-13",
                "--seed",
                "status",
                "--timezone",
                "UTC",
            ]
        )
        == 1
    )
    output = capsys.readouterr()
    assert "location_context" in output.out + output.err
