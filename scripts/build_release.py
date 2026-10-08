"""Build the runtime zip for manual installs; it extracts into the domain directory."""

import hashlib
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
INTEGRATION = ROOT / "custom_components" / "occupied"


def build(destination: Path):
    if not (INTEGRATION / "frontend" / "dist" / "occupied-panel.js").is_file():
        raise RuntimeError("Frontend assets are missing. Run npm ci and npm run build first.")
    destination.mkdir(parents=True, exist_ok=True)
    archive = destination / "occupied.zip"
    with ZipFile(archive, "w", compression=ZIP_DEFLATED) as bundle:
        for path in sorted(INTEGRATION.rglob("*")):
            if not path.is_file() or path.suffix not in {".py", ".json", ".yaml", ".js", ".png"}:
                continue
            if "__pycache__" in path.parts:
                continue
            info = ZipInfo(
                path.relative_to(INTEGRATION).as_posix(), date_time=(2026, 1, 1, 0, 0, 0)
            )
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            bundle.writestr(info, path.read_bytes())
        info = ZipInfo("LICENSE", date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        bundle.writestr(info, (ROOT / "LICENSE").read_bytes())
    return archive


if __name__ == "__main__":
    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist"
    archive = build(destination)
    version = json.loads((INTEGRATION / "manifest.json").read_text())["version"]
    print(f"Built {archive} ({version})")
    artifacts = [
        archive,
        destination / f"occupied-{version}-py3-none-any.whl",
        destination / f"occupied-{version}.tar.gz",
    ]
    checksums = [
        f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}"
        for path in sorted(artifacts)
    ]
    (destination / "SHA256SUMS").write_text("\n".join(checksums) + "\n")
