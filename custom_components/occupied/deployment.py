"""Optional authenticated reload client; no HA dependency or background process."""

import json
import logging
from ipaddress import ip_address
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

_LOGGER = logging.getLogger(__name__)


def _private_or_loopback(hostname):
    if hostname.rstrip(".") == "localhost":
        return True
    try:
        address = ip_address(hostname)
    except ValueError:
        return False
    return address.is_private or address.is_loopback


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("Reload endpoint redirected; choose the final Home Assistant URL")


def reload_file(url: str, entry_id: str, token_file: Path, *, timeout: float = 10):
    parsed = urlsplit(url)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or parsed.path not in {"", "/"}
    ):
        raise ValueError(
            "Choose a Home Assistant http(s) origin without credentials, query or path"
        )
    token = token_file.read_text(encoding="utf-8").strip()
    if not token or "\n" in token or "\r" in token:
        raise ValueError("The token file must contain one nonempty access token")
    if parsed.scheme == "http" and not _private_or_loopback(parsed.hostname):
        _LOGGER.warning(
            "Home Assistant reload uses HTTP to a public or unresolved host; "
            "use HTTPS to protect the access token"
        )
    request = Request(
        url.rstrip("/") + "/api/services/occupied/reload?return_response",
        data=json.dumps({"config_entry_id": entry_id}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with build_opener(NoRedirect()).open(request, timeout=timeout) as response:
            document = json.loads(response.read(1_048_577))
    except HTTPError as err:
        raise ValueError(f"Home Assistant rejected reload (HTTP {err.code})") from None
    except (URLError, TimeoutError) as err:
        raise ValueError("Cannot reach Home Assistant for reload") from err
    result = document.get("service_response") if isinstance(document, dict) else None
    if not isinstance(result, dict) or not isinstance(result.get("valid"), bool):
        raise ValueError("Home Assistant returned no Occupied reload result")
    # Tokens, source paths and server response bodies never appear in CLI output.
    return {key: result.get(key) for key in ("valid", "changed", "mode", "status")}
