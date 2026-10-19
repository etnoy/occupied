"""Serve the release ZIP in an isolated Home Assistant instance for browser tests."""

import json
import os
import signal
import subprocess
import sys
import tempfile
from pathlib import Path
from uuid import uuid4
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
artifacts = ROOT / ".browser-artifacts"
artifacts.mkdir(exist_ok=True)
config = Path(tempfile.mkdtemp(prefix="ha-", dir=artifacts))
with ZipFile(ROOT / "dist" / "occupied.zip") as archive:
    archive.extractall(config / "custom_components" / "occupied")
# Prefer the extracted release over the editable checkout's namespace package.
(config / "custom_components" / "__init__.py").touch()
(config / "configuration.yaml").write_text(
    """homeassistant:
  name: Occupied browser tests
  latitude: 59.3
  longitude: 18.1
  elevation: 0
  unit_system: metric
  time_zone: Europe/Stockholm
  country: SE
frontend:
# HA's application shell requests recorder/info even outside history panels.
recorder:
http:
  server_host: 0.0.0.0
  server_port: 18123
logger:
  default: warning
template:
  - light:
      - name: Smoke light
        unique_id: occupied_smoke_light
        state: "{{ false }}"
        turn_on: []
        turn_off: []
"""
)
# Skip HA's location/analytics/integration recommendations, which otherwise add
# unrelated internet services. The test creates its owner through HA onboarding.
(config / ".storage").mkdir()
(config / ".storage" / "onboarding").write_text(
    json.dumps(
        {
            "version": 4,
            "minor_version": 1,
            "key": "onboarding",
            "data": {"done": ["core_config", "analytics", "integration"]},
        }
    )
)
# Use HA's complete runtime: its frontend imports optional integrations that the
# unit-test lock intentionally does not install. Pin the multi-architecture image.
image = os.environ.get("HA_IMAGE")
if not image:
    import yaml

    workflow = yaml.safe_load((ROOT / ".github/workflows/check.yml").read_text())
    matrix = workflow["jobs"]["matrix"]["strategy"]["matrix"]["include"][0]
    image = next(lane["image"] for lane in matrix["lanes"] if lane["role"] == "newest")
container = f"occupied-browser-{uuid4().hex[:12]}"
# Seed/read recovery storage through this disposable container, not host permissions.
(artifacts / "active-container").write_text(container)
command = [
    "docker",
    "run",
    "--rm",
    "--init",
    "--name",
    container,
    "--publish",
    "127.0.0.1:18123:18123",
    "--volume",
    f"{config}:/config",
    "--volume",
    f"{artifacts}:/artifacts",
    "--entrypoint",
    "python",
    image,
    "-m",
    "homeassistant",
    "--config",
    "/config",
    "--log-file",
    "/artifacts/homeassistant.log",
]


def stop(signum, _frame):
    """Let Playwright's shutdown signal run the container cleanup below."""
    raise SystemExit(128 + signum)


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
server = subprocess.Popen(command)
try:
    sys.exit(server.wait())
finally:
    for arguments in (["stop", "--time", "5"], ["rm", "--force"]):
        subprocess.run(
            ["docker", *arguments, container],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.STDOUT,
            timeout=15,
        )
    server.wait(timeout=15)
