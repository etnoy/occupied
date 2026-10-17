"""Reload transport verifies results without printing tokens or response bodies."""

import json
from unittest.mock import MagicMock
from urllib.error import HTTPError, URLError

import pytest

from custom_components.occupied.cli import main
from custom_components.occupied.deployment import NoRedirect, reload_file


@pytest.fixture
def token_file(tmp_path):
    path = tmp_path / "token"
    path.write_text("test-secret-token\n")
    return path


@pytest.fixture
def opener(monkeypatch):
    mocked = MagicMock()
    monkeypatch.setattr("custom_components.occupied.deployment.build_opener", lambda *_args: mocked)
    return mocked


@pytest.mark.parametrize("valid", [True, False])
def test_reload_authenticated_result_and_exit_status(token_file, opener, capsys, valid):
    opener.open.return_value.__enter__.return_value.read.return_value = json.dumps(
        {
            "service_response": {
                "valid": valid,
                "changed": False,
                "mode": "file",
                "status": "ready" if valid else "error",
                "issues": ["private content"],
            }
        }
    ).encode()
    assert main(
        [
            "reload",
            "--url",
            "https://ha.example",
            "--entry-id",
            "house",
            "--token-file",
            str(token_file),
        ]
    ) == (0 if valid else 2)
    output = capsys.readouterr().out
    assert "test-secret-token" not in output and "private content" not in output
    request = opener.open.call_args.args[0]
    assert request.get_header("Authorization") == "Bearer test-secret-token"
    assert request.full_url.endswith("/api/services/occupied/reload?return_response")
    assert json.loads(request.data) == {"config_entry_id": "house"}


@pytest.mark.parametrize(
    "url",
    [
        "https://user:secret@ha.example",
        "ftp://ha.example",
        "https://ha.example/path",
        "https://ha.example?token=secret",
    ],
)
def test_invalid_origins_fail_before_transport(url, token_file, opener):
    with pytest.raises(ValueError, match="origin"):
        reload_file(url, "house", token_file)
    opener.open.assert_not_called()


def test_redirects_never_forward_authorization():
    with pytest.raises(ValueError, match="redirected"):
        NoRedirect().redirect_request(None, None, 302, "Found", {}, "https://elsewhere.example")


@pytest.mark.parametrize(
    "error",
    [
        HTTPError("https://ha.example", 401, "test-secret-token", {}, None),
        URLError("test-secret-token"),
    ],
)
def test_reload_errors_redact_transport(token_file, opener, capsys, error):
    opener.open.side_effect = error
    assert (
        main(
            [
                "reload",
                "--url",
                "https://ha.example",
                "--entry-id",
                "house",
                "--token-file",
                str(token_file),
            ]
        )
        == 2
    )
    assert "test-secret-token" not in capsys.readouterr().err


def test_missing_service_response_is_not_success(token_file, opener):
    opener.open.return_value.__enter__.return_value.read.return_value = b"[]"
    with pytest.raises(ValueError, match="no Occupied"):
        reload_file("https://ha.example", "house", token_file)
