"""Plain HTTP to public or unresolved hosts emits a token-safe warning."""

import logging
from unittest.mock import MagicMock

import pytest

from custom_components.occupied.deployment import reload_file


@pytest.mark.parametrize(
    "origin, warned",
    [
        ("http://8.8.8.8:8123", True),
        ("http://[2001:4860:4860::8888]:8123", True),
        ("http://ha.example:8123", True),
        ("http://127.0.0.1:8123", False),
        ("http://[::1]:8123", False),
        ("http://localhost:8123", False),
        ("http://10.1.2.3:8123", False),
        ("http://172.16.1.2:8123", False),
        ("http://192.168.1.2:8123", False),
        ("http://[fd12::1]:8123", False),
        ("https://ha.example", False),
    ],
)
def test_reload_warns_for_public_http_without_exposing_tokens(
    tmp_path, monkeypatch, caplog, origin, warned
):
    token = tmp_path / "token"
    token.write_text("test-secret-token\n", encoding="utf-8")
    transport = MagicMock()
    transport.open.return_value.__enter__.return_value.read.return_value = (
        b'{"service_response": {"valid": true}}'
    )
    monkeypatch.setattr(
        "custom_components.occupied.deployment.build_opener", lambda *_args: transport
    )
    # Classify literal addresses and localhost without resolving user-supplied names.
    monkeypatch.setattr("socket.getaddrinfo", MagicMock(side_effect=AssertionError("DNS lookup")))
    caplog.set_level(logging.WARNING, logger="custom_components.occupied.deployment")
    assert reload_file(origin, "house", token)["valid"]
    transport.open.assert_called_once()
    warnings = [
        record
        for record in caplog.records
        if record.name == "custom_components.occupied.deployment"
        and record.levelno >= logging.WARNING
    ]
    assert bool(warnings) is warned
    if warned:
        assert "HTTPS" in warnings[0].getMessage()
    assert "test-secret-token" not in caplog.text
