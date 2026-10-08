"""Check built installable artifacts, including complete runtime assets and source fixtures."""

import hashlib
import json
import sys
import tarfile
from pathlib import Path
from zipfile import ZipFile

directory = Path(sys.argv[1] if len(sys.argv) > 1 else "dist")
with ZipFile(directory / "occupied.zip") as integration:
    version = json.loads(integration.read("manifest.json"))["version"]
    names = set(integration.namelist())
    assert "__init__.py" in names and "managed.py" in names and "LICENSE" in names
    assert "frontend/dist/occupied-panel.js" in names and "translations/en.json" in names
    assert not any(name.endswith(".ts") for name in names)
    assert all(name.startswith("frontend/dist/") for name in names if name.endswith(".js"))
    assert "brand/icon.png" in names and "brand/icon@2x.png" in names
    assert not any("__pycache__" in name or name.startswith("custom_components/") for name in names)
    with ZipFile(directory / f"occupied-{version}-py3-none-any.whl") as wheel:
        for name in names - {"LICENSE"}:
            assert wheel.read(f"custom_components/occupied/{name}") == integration.read(name)
        assert any(name.endswith("/licenses/LICENSE") for name in wheel.namelist())
with tarfile.open(directory / f"occupied-{version}.tar.gz") as source:
    for relative in (
        "pyproject.toml",
        "uv.lock",
        "tests/conftest.py",
        "tests/frontend/harness.html",
        "pnpm-lock.yaml",
        "tsconfig.json",
        "scripts/build-frontend.ts",
        "custom_components/occupied/frontend/occupied-panel.ts",
        "tests/frontend/src/model.test.ts",
        "schema/occupied.schema.json",
        "examples/puppet/occupied.pp",
        "scripts/check_artifacts.py",
    ):
        assert f"occupied-{version}/{relative}" in source.getnames()
checksums = (directory / "SHA256SUMS").read_text().splitlines()
assert {line.split("  ", 1)[1] for line in checksums} == {
    "occupied.zip",
    f"occupied-{version}-py3-none-any.whl",
    f"occupied-{version}.tar.gz",
}
for line in checksums:
    expected, name = line.split("  ", 1)
    assert hashlib.sha256((directory / name).read_bytes()).hexdigest() == expected
print(f"Release {version}: zip, wheel, source distribution and checksums verified")
