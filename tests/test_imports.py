"""Exercise cold imports without pytest collection warming Pydantic's plugin cache."""

import subprocess
import sys
from textwrap import dedent


def test_cold_start_reads_pydantic_metadata_outside_event_loop(tmp_path):
    script = dedent(
        """
        import asyncio
        import sys
        from pathlib import Path
        from unittest.mock import patch

        from homeassistant.core import HomeAssistant
        from homeassistant.loader import async_get_integration, async_setup

        metadata_reads = []
        read_text = Path.read_text

        def checked_read_text(path, *args, **kwargs):
            if path.name == "entry_points.txt":
                try:
                    asyncio.get_running_loop()
                except RuntimeError:
                    pass
                else:
                    raise AssertionError(f"Blocking metadata read on event loop: {path}")
                metadata_reads.append(path)
            return read_text(path, *args, **kwargs)

        async def main():
            hass = HomeAssistant(sys.argv[1])
            async_setup(hass)
            integration = await async_get_integration(hass, "occupied")
            await integration.async_get_component()

            # Follow the deferred setup import chain from the reported traceback.
            from custom_components.occupied.engine import OccupiedEngine
            from custom_components.occupied.validation import validate_program

            assert OccupiedEngine is not None
            assert validate_program({"schema_version": 1, "name": "House"}).name == "House"
            assert metadata_reads, "Cold startup did not exercise plugin discovery"
            await hass.async_stop(force=True)

        with patch.object(Path, "read_text", checked_read_text):
            asyncio.run(main())
        """
    )
    result = subprocess.run(
        [sys.executable, "-c", script, str(tmp_path)],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stderr
