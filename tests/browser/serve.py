"""Serve the release ZIP in an isolated Home Assistant instance for browser tests."""

import json
import os
import sys
import tempfile
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
artifacts = ROOT / ".browser-artifacts"
artifacts.mkdir(exist_ok=True)
config = Path(tempfile.mkdtemp(prefix="ha-", dir=artifacts))
with ZipFile(ROOT / "dist" / "occupied.zip") as archive:
    archive.extractall(config / "custom_components" / "occupied")
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
http:
  server_host: 127.0.0.1
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
os.chdir(config)
os.execv(
    sys.executable,
    [
        sys.executable,
        "-m",
        "homeassistant",
        "--config",
        str(config),
        "--log-file",
        str(artifacts / "homeassistant.log"),
        "--skip-pip",
    ],
)
