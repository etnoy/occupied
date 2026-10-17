"""The standalone planner and CLI do not load Home Assistant."""

import subprocess
import sys


def test_cli_imports_without_loading_home_assistant():
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "import sys; from custom_components.occupied.cli import main; "
            "from custom_components.occupied.plan_codec import plan_from_data; "
            "assert not any(name == 'homeassistant' or name.startswith('homeassistant.') "
            "for name in sys.modules)",
        ],
        capture_output=True,
        text=True,
        check=False,
        timeout=15,
    )
    assert result.returncode == 0, result.stderr
