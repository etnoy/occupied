"""Compile, validate, reproduce, and roll the supported Home Assistant environments."""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import tomllib
import urllib.request
from dataclasses import asdict, dataclass, replace
from functools import cache
from pathlib import Path

from packaging.requirements import Requirement
from packaging.utils import canonicalize_name
from packaging.version import Version

ROOT = Path(__file__).resolve().parents[1]
HA_ROLES = {"floor", "window", "newest"}
TABLE_START = "<!-- ha-matrix:start -->"
TABLE_END = "<!-- ha-matrix:end -->"


@dataclass(frozen=True)
class Lane:
    id: str
    role: str
    homeassistant: str
    phcc: str
    frontend: str
    python: str
    image: str
    constraints_sha256: str = ""

    @property
    def stem(self):
        return f"ha-{self.homeassistant}"

    @property
    def header(self):
        digest = hashlib.sha256(json.dumps(asdict(self), sort_keys=True).encode()).hexdigest()
        return f"# Occupied lane: {self.id}; metadata-sha256={digest}"


def load(root=ROOT):
    data = tomllib.loads((root / "scripts/ha_matrix.toml").read_text())
    if data["format"] != 1:
        raise ValueError("Unsupported HA matrix format")
    return data["policy"], [Lane(**lane) for lane in data["lanes"]]


def ha_lanes(lanes):
    return sorted(
        (lane for lane in lanes if lane.role in HA_ROLES),
        key=lambda lane: Version(lane.homeassistant),
    )


def selected(lanes, name):
    found = [lane for lane in lanes if name in {lane.id, lane.role, lane.homeassistant}]
    if name not in {"python-floor", "next"}:
        found = [lane for lane in found if lane.role in HA_ROLES]
    if len(found) != 1:
        raise ValueError(f"Choose a unique HA lane: {name}")
    return found[0]


def constraints_path(root, lane):
    return root / "scripts/requirements" / f"{lane.stem}.constraints"


def pins(text):
    result = {}
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith(("#", "--")):
            continue
        try:
            requirement = Requirement(line.rstrip(" \\"))
        except Exception:
            continue
        exact = [s.version for s in requirement.specifier if s.operator == "=="]
        if len(exact) == 1:
            result[canonicalize_name(requirement.name)] = exact[0]
    return result


def table(lanes):
    lines = [TABLE_START, "| Home Assistant tested | Python tested | Lane |", "| --- | --- | --- |"]
    for lane in ha_lanes(lanes):
        lines.append(f"| {lane.homeassistant} | {lane.python} | {lane.role} |")
    floor_python = selected(lanes, "python-floor")
    lines.append(f"| {floor_python.homeassistant} | {floor_python.python} | Python floor |")
    return "\n".join([*lines, TABLE_END])


def check(root=ROOT):
    policy, lanes = load(root)
    actual = ha_lanes(lanes)
    if len(actual) != policy["window"] or len({lane.id for lane in lanes}) != len(lanes):
        raise ValueError("HA matrix window size and lane IDs must be consistent")
    if [lane.role for lane in actual] != ["floor", *(["window"] * (len(actual) - 2)), "newest"]:
        raise ValueError("HA matrix must have exactly one oldest floor and one newest lane")
    floor, newest = actual[0], actual[-1]
    months = [
        Version(lane.homeassistant).release[0] * 12 + Version(lane.homeassistant).release[1]
        for lane in actual
    ]
    if months != list(range(months[-1] - policy["window"] + 1, months[-1] + 1)):
        raise ValueError("HA matrix must cover consecutive monthly releases")
    if Version(floor.homeassistant).micro != 0:
        raise ValueError("The oldest HA minor must be tested from its .0 floor")
    if any(lane.role not in HA_ROLES | {"python-floor", "next"} for lane in lanes):
        raise ValueError("Unknown HA matrix lane role")
    python_floor = selected(lanes, "python-floor")
    if replace(python_floor, id=newest.id, role="newest", python=newest.python) != newest:
        raise ValueError("Python floor must use the newest HA environment")
    if python_floor.python != policy["python_floor"] or newest.python != policy["python_latest"]:
        raise ValueError("Pinned Python versions disagree with the matrix policy")
    hacs = json.loads((root / "hacs.json").read_text())
    if hacs["homeassistant"] != floor.homeassistant:
        raise ValueError("hacs.json must declare the HA floor lane")
    project = tomllib.loads((root / "pyproject.toml").read_text())["project"]
    if project["requires-python"] != f">={policy['python_floor']}":
        raise ValueError("requires-python must equal the lowest supported Python")
    locked = {
        p["name"]: p["version"] for p in tomllib.loads((root / "uv.lock").read_text())["package"]
    }
    for package, version in (
        ("homeassistant", newest.homeassistant),
        ("pytest-homeassistant-custom-component", newest.phcc),
        ("home-assistant-frontend", newest.frontend),
    ):
        if locked.get(package) != version:
            raise ValueError(f"uv.lock {package} must match the newest lane")
    readme = (root / "README.md").read_text()
    if table(lanes) not in readme:
        raise ValueError("README compatibility table differs from the matrix")
    manifest = json.loads((root / "custom_components/occupied/manifest.json").read_text())
    runtime_requirements = [Requirement(r) for r in project["dependencies"]]
    integration_requirements = [Requirement(r) for r in manifest["requirements"]]
    expected_files = set()
    floor_pins = None
    for lane in actual:
        if not re.fullmatch(
            r"ghcr.io/home-assistant/home-assistant:[^@]+@sha256:[0-9a-f]{64}", lane.image
        ):
            raise ValueError(f"{lane.id}: browser image must be pinned by digest")
        path = constraints_path(root, lane)
        expected_files.add(path.name)
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != lane.constraints_sha256:
            raise ValueError(f"{lane.id}: official constraints digest differs")
        lane_pins = pins(data.decode())
        if lane.role == "floor":
            floor_pins = lane_pins
        for requirement in runtime_requirements + integration_requirements:
            version = lane_pins.get(canonicalize_name(requirement.name))
            if version is not None and Version(version) not in requirement.specifier:
                raise ValueError(f"{lane.id}: {requirement} excludes HA's pin {version}")
        if lane.role != "newest":
            requirement_file = path.with_suffix(".txt")
            override_file = path.with_suffix(".overrides")
            expected_files.update((requirement_file.name, override_file.name))
            source = requirement_file.read_text()
            if source.splitlines()[0] != lane.header or "--hash=sha256:" not in source:
                raise ValueError(f"{lane.id}: requirements header or hashes differ")
            resolved = pins(source)
            security = security_pins(policy, lane_pins)
            for package, version in security.items():
                if resolved.get(package) != version:
                    raise ValueError(f"{lane.id}: security override requires {package}=={version}")
            if security and security_header(security) not in source.splitlines()[:3]:
                raise ValueError(f"{lane.id}: security override provenance is missing")
            for package, version in (
                ("homeassistant", lane.homeassistant),
                ("pytest-homeassistant-custom-component", lane.phcc),
                ("home-assistant-frontend", lane.frontend),
            ):
                if resolved.get(package) != version:
                    raise ValueError(f"{lane.id}: hashed requirements have the wrong {package}")
            for requirement in runtime_requirements:
                name = canonicalize_name(requirement.name)
                if name in lane_pins and resolved.get(name) != lane_pins[name]:
                    raise ValueError(
                        f"{lane.id}: hashed runtime {name} differs from HA's constraint"
                    )
            if override_file.read_text() != overrides(lane, security):
                raise ValueError(f"{lane.id}: overrides differ from the matrix")
    pydantic_requirement = next(
        (r for r in integration_requirements if canonicalize_name(r.name) == "pydantic"), None
    )
    if (
        pydantic_requirement is None
        or str(pydantic_requirement.specifier) != f">={floor_pins['pydantic']}"
    ):
        raise ValueError("Manifest pydantic must have only the HA-floor lower bound")
    newest_pins = pins(constraints_path(root, newest).read_text())
    for requirement in runtime_requirements:
        name = canonicalize_name(requirement.name)
        if name in newest_pins and locked.get(name) != newest_pins[name]:
            raise ValueError(f"uv.lock {name} must match the newest HA runtime constraint")
    for requirement in runtime_requirements:
        version = floor_pins.get(canonicalize_name(requirement.name))
        if version and not any(
            s.operator == ">=" and s.version == version for s in requirement.specifier
        ):
            raise ValueError(
                f"Runtime floor for {requirement.name} must equal HA floor pin {version}"
            )
    extras = {p.name for p in (root / "scripts/requirements").glob("ha-*")} - expected_files
    if extras:
        raise ValueError(f"Stale HA lane files: {', '.join(sorted(extras))}")
    for path in (root / "custom_components/occupied").glob("*.py"):
        for remove_at in re.findall(r"remove_when_floor:\s*(\d{4}\.\d+\.\d+)", path.read_text()):
            if Version(floor.homeassistant) >= Version(remove_at):
                raise ValueError(
                    f"Remove expired compatibility shim in {path.name} (floor {remove_at})"
                )
    return {"floor": floor.homeassistant, "newest": newest.homeassistant, "lanes": len(actual)}


def uv():
    return os.environ.get("OCCUPIED_UV") or shutil.which("uv") or str(ROOT / ".venv/bin/uv")


def run(command, root=ROOT, **kwargs):
    return subprocess.run([str(part) for part in command], cwd=root, check=True, **kwargs)


def fetch_text(url):
    request = urllib.request.Request(url, headers={"User-Agent": "occupied-ha-matrix"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode()


def security_pins(policy, constrained):
    return {
        canonicalize_name(name): version
        for name, version in policy.get("security_overrides", {}).items()
        if canonicalize_name(name) in constrained
        and Version(constrained[canonicalize_name(name)]) < Version(version)
    }


def security_header(security):
    pins = ", ".join(f"{name}=={version}" for name, version in sorted(security.items()))
    return f"# Security overrides: {pins}; see README compatibility tooling notes"


def patched_constraints(source, security):
    """Preserve every official pin except explicitly recorded security repairs."""
    return (
        "\n".join(line for line in source.splitlines() if not (set(pins(line)) & security.keys()))
        + "\n"
    )


def overrides(lane, security=None):
    return (
        f"homeassistant=={lane.homeassistant}\n"
        f"pytest-homeassistant-custom-component=={lane.phcc}\n"
        f"home-assistant-frontend=={lane.frontend}\n"
    ) + "".join(f"{name}=={version}\n" for name, version in sorted((security or {}).items()))


def compile_lanes(root=ROOT):
    policy, lanes = load(root)
    directory = root / "scripts/requirements"
    directory.mkdir(exist_ok=True)
    expected = set()
    for lane in ha_lanes(lanes):
        path = constraints_path(root, lane)
        expected.add(path.name)
        if not path.exists():
            path.write_text(
                fetch_text(
                    f"https://raw.githubusercontent.com/home-assistant/core/{lane.homeassistant}/homeassistant/package_constraints.txt"
                )
            )
        if hashlib.sha256(path.read_bytes()).hexdigest() != lane.constraints_sha256:
            raise ValueError(f"{lane.id}: constraints do not match the recorded official digest")
        if lane.role == "newest":
            continue
        override_file = path.with_suffix(".overrides")
        security = security_pins(policy, pins(path.read_text()))
        override_file.write_text(overrides(lane, security))
        requirement_file = path.with_suffix(".txt")
        expected.update((override_file.name, requirement_file.name))
        with tempfile.TemporaryDirectory(prefix="occupied-constraints-") as temporary:
            effective = Path(temporary) / path.name
            effective.write_text(patched_constraints(path.read_text(), security))
            _compile_lane(root, lane, override_file, effective, requirement_file)
            source = requirement_file.read_text().replace(
                str(effective), str(path.relative_to(root))
            )
        provenance = security_header(security) + "\n" if security else ""
        requirement_file.write_text(
            lane.header
            + "\n# Regenerate: python scripts/ha_matrix.py compile\n"
            + provenance
            + source
        )
    for path in directory.glob("ha-*"):
        if path.name not in expected and path.suffix in {".txt", ".constraints", ".overrides"}:
            path.unlink()


def _compile_lane(root, lane, override_file, constraints, requirement_file):
    run(
        [
            uv(),
            "pip",
            "compile",
            "pyproject.toml",
            "--group",
            "dev",
            "--overrides",
            override_file.relative_to(root),
            "--constraint",
            constraints,
            "--python-version",
            lane.python,
            "--universal",
            "--generate-hashes",
            "--no-header",
            "--output-file",
            requirement_file.relative_to(root),
        ],
        root,
        stdout=subprocess.DEVNULL,
    )


def github_matrix(kind="ha", root=ROOT):
    policy, lanes = load(root)
    if kind == "core":
        return {
            "include": [
                {"python": version, "experimental": version == policy["python_next"]}
                for version in (
                    policy["python_floor"],
                    policy["python_latest"],
                    policy["python_next"],
                )
            ]
        }
    chosen = ha_lanes(lanes)
    if kind == "browser":
        chosen = [lane for lane in chosen if lane.role in {"floor", "newest"}]
    elif kind == "python-floor":
        chosen = [selected(lanes, "python-floor")]
    return {
        "include": [
            {
                "id": lane.id,
                "uv": policy["uv"],
                "role": lane.role,
                "homeassistant": lane.homeassistant,
                "python": lane.python,
                "image": lane.image,
                "requirements": f"scripts/requirements/{lane.stem}.txt"
                if lane.role in {"floor", "window"}
                else "",
            }
            for lane in chosen
        ]
    }


def test_lane(name, pytest_args=(), root=ROOT):
    _, lanes = load(root)
    if name == "all":
        for lane in ha_lanes(lanes):
            test_lane(lane.id, pytest_args, root)
        return
    lane = selected(lanes, name)
    if lane.role == "next":
        raise ValueError("Use the next-lane workflow for dynamic pre-release environments")
    with tempfile.TemporaryDirectory(prefix=f"occupied-{lane.id}-") as temporary:
        directory = Path(temporary)
        interpreter = (
            sys.executable
            if lane.python == ".".join(map(str, sys.version_info[:3]))
            else lane.python
        )
        environment = directory / "venv"
        run([uv(), "venv", "--python", interpreter, environment], root)
        python = environment / "bin/python"
        requirements = root / f"scripts/requirements/{lane.stem}.txt"
        if lane.role in {"newest", "python-floor"}:
            requirements = directory / "requirements.txt"
            run(
                [
                    uv(),
                    "export",
                    "--locked",
                    "--group",
                    "dev",
                    "--no-emit-project",
                    "--output-file",
                    requirements,
                ],
                root,
                stdout=subprocess.DEVNULL,
            )
        run([uv(), "pip", "sync", "--python", python, "--require-hashes", requirements], root)
        run([uv(), "pip", "install", "--python", python, "--no-deps", "-e", "."], root)
        run([uv(), "pip", "check", "--python", python], root)
        environment_variables = os.environ.copy()
        environment_variables["PATH"] = (
            str(environment / "bin") + os.pathsep + environment_variables["PATH"]
        )
        run([python, "-m", "pytest", *pytest_args], root, env=environment_variables)


@cache
def package_json(package, version=None):
    suffix = f"/{version}" if version else ""
    return json.loads(fetch_text(f"https://pypi.org/pypi/{package}{suffix}/json"))


def published_versions(package):
    releases = package_json(package)["releases"]
    return sorted(
        (
            Version(v)
            for v, files in releases.items()
            if files and not all(f.get("yanked") for f in files)
        ),
        reverse=True,
    )


def matching_phcc(version):
    from concurrent.futures import ThreadPoolExecutor

    candidates = [
        v
        for v in published_versions("pytest-homeassistant-custom-component")
        if not v.is_prerelease
    ][:180]

    def matches(candidate):
        metadata = package_json("pytest-homeassistant-custom-component", str(candidate))
        for raw in metadata["info"].get("requires_dist") or []:
            requirement = Requirement(raw)
            if (
                canonicalize_name(requirement.name) == "homeassistant"
                and Version(version) in requirement.specifier
            ):
                return str(candidate)
        return None

    for offset in range(0, len(candidates), 12):
        with ThreadPoolExecutor(max_workers=6) as pool:
            for match in pool.map(matches, candidates[offset : offset + 12]):
                if match:
                    return match
    return None


def requires_python(version):
    specifier = package_json("homeassistant", version)["info"]["requires_python"]
    match = re.search(r">=\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)", specifier)
    if not match:
        raise ValueError(f"Cannot determine HA {version}'s Python floor: {specifier}")
    return match[1]


def next_release(root=ROOT):
    from datetime import UTC, datetime

    policy, lanes = load(root)
    newest = selected(lanes, "newest")
    current = Version(newest.homeassistant)
    newer = [v for v in published_versions("homeassistant") if v > current and not v.is_devrelease]
    prereleases = [v for v in newer if v.is_prerelease]
    stable = [v for v in newer if not v.is_prerelease]
    candidate = next(iter(prereleases or stable), None)
    result = {"available": candidate is not None, "stable_lag_days": 0, "stale": False}
    for version in stable[:12]:
        if matching_phcc(str(version)):
            files = package_json("homeassistant", str(version))["urls"]
            published = min(
                datetime.fromisoformat(f["upload_time_iso_8601"].replace("Z", "+00:00"))
                for f in files
                if not f.get("yanked")
            )
            result["stable_lag_days"] = (datetime.now(UTC) - published).days
            result["stale"] = result["stable_lag_days"] > 14
            break
    if candidate is None:
        return result
    version = str(candidate)
    requirement = requires_python(version)
    python = (
        policy["python_latest"]
        if Version(requirement) <= Version(policy["python_latest"])
        else requirement
    )
    constraint_text = fetch_text(
        f"https://raw.githubusercontent.com/home-assistant/core/{version}/homeassistant/package_constraints.txt"
    )
    result.update(
        {
            "homeassistant": version,
            "phcc": matching_phcc(version),
            "fallback_phcc": newest.phcc,
            "frontend": pins(constraint_text)["home-assistant-frontend"],
            "python": python,
            "requires_python": requirement,
            "image": f"ghcr.io/home-assistant/home-assistant:{version}",
        }
    )
    return result


def image_digest(version):
    token = json.loads(
        fetch_text(
            "https://ghcr.io/token?service=ghcr.io&scope=repository:home-assistant/home-assistant:pull"
        )
    )["token"]
    request = urllib.request.Request(
        f"https://ghcr.io/v2/home-assistant/home-assistant/manifests/{version}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": (
                "application/vnd.oci.image.index.v1+json, "
                "application/vnd.docker.distribution.manifest.list.v2+json"
            ),
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        digest = response.headers["Docker-Content-Digest"]
    return f"ghcr.io/home-assistant/home-assistant:{version}@{digest}"


def write_matrix(policy, lanes, root=ROOT):
    lines = [
        "# Maintained with python scripts/ha_matrix.py roll <year.month>",
        "format = 1",
        "",
        "[policy]",
    ]
    for key, value in policy.items():
        if isinstance(value, dict):
            rendered = ", ".join(f"{json.dumps(k)} = {json.dumps(v)}" for k, v in value.items())
            lines.append(f"{key} = {{{rendered}}}")
        else:
            lines.append(f"{key} = {json.dumps(value)}")
    for lane in lanes:
        lines.extend(["", "[[lanes]]"])
        lines.extend(f"{key} = {json.dumps(value)}" for key, value in asdict(lane).items())
    (root / "scripts/ha_matrix.toml").write_text("\n".join(lines) + "\n")


def update_claims(root=ROOT):
    policy, lanes = load(root)
    floor, newest = ha_lanes(lanes)[0], selected(lanes, "newest")
    path = root / "hacs.json"
    data = json.loads(path.read_text())
    data["homeassistant"] = floor.homeassistant
    path.write_text(json.dumps(data, indent=2) + "\n")
    path = root / "README.md"
    source = path.read_text()
    rendered = table(lanes)
    if TABLE_START in source:
        start, end = source.index(TABLE_START), source.index(TABLE_END) + len(TABLE_END)
        source = source[:start] + rendered + source[end:]
    else:
        source, count = re.subn(
            r"CI tests Home Assistant [^\n]+\n"
            r"The minimum supported Home Assistant version is [^\n]+",
            "## Compatibility\n\n" + rendered,
            source,
        )
        if count != 1:
            raise ValueError("Add compatibility table markers to README before updating claims")
    path.write_text(source)
    path = root / "pyproject.toml"
    source = path.read_text()
    for name, version in (
        ("homeassistant", newest.homeassistant),
        ("pytest-homeassistant-custom-component", newest.phcc),
        ("home-assistant-frontend", newest.frontend),
    ):
        source = re.sub(rf'"{name}==[^\"]+"', f'"{name}=={version}"', source)
    source = re.sub(
        r'requires-python = "[^"]+"', f'requires-python = ">={policy["python_floor"]}"', source
    )
    original = tomllib.loads(source)["project"]
    floor_pins = pins(constraints_path(root, floor).read_text())
    for raw in original["dependencies"]:
        name = canonicalize_name(Requirement(raw).name)
        if name in floor_pins:
            updated = re.sub(r">=[^,]+", f">={floor_pins[name]}", raw)
            source = source.replace(json.dumps(raw), json.dumps(updated))
    path.write_text(source)
    path = root / "custom_components/occupied/manifest.json"
    manifest = json.loads(path.read_text())
    manifest["requirements"] = [f"pydantic>={floor_pins['pydantic']}"]
    path.write_text(json.dumps(manifest, indent=2) + "\n")


def roll(minor, root=ROOT):
    if not re.fullmatch(r"\d{4}\.\d{1,2}", minor):
        raise ValueError("Use a Home Assistant minor such as 2026.11")
    policy, old_lanes = load(root)
    newest = selected(old_lanes, "newest")
    if Version(minor) <= Version(".".join(newest.homeassistant.split(".")[:2])):
        raise ValueError("Rollover must advance to a newer HA minor")
    year, month = map(int, minor.split("."))
    if not 1 <= month <= 12:
        raise ValueError("Invalid monthly HA release")
    target = year * 12 + month - 1
    versions = [
        v
        for v in published_versions("homeassistant")
        if not v.is_prerelease and not v.is_devrelease
    ]
    lanes, constraint_files = [], {}
    for offset, serial in enumerate(range(target - policy["window"] + 1, target + 1)):
        lane_year, lane_month = serial // 12, serial % 12 + 1
        candidates = [v for v in versions if v.release[:2] == (lane_year, lane_month)]
        if offset == 0:
            candidates = [v for v in candidates if v.micro == 0]
        chosen = next(
            ((str(v), fixture) for v in candidates if (fixture := matching_phcc(str(v)))), None
        )
        if chosen is None:
            raise ValueError(f"HA {lane_year}.{lane_month} has no published matching test fixture")
        version, fixture = chosen
        text = fetch_text(
            f"https://raw.githubusercontent.com/home-assistant/core/{version}/homeassistant/package_constraints.txt"
        )
        constraint_files[version] = text
        minimum = requires_python(version)
        python = (
            policy["python_latest"]
            if Version(policy["python_latest"]) >= Version(minimum)
            else minimum
        )
        role = "floor" if offset == 0 else "newest" if serial == target else "window"
        lanes.append(
            Lane(
                f"ha-{version}",
                role,
                version,
                fixture,
                pins(text)["home-assistant-frontend"],
                python,
                image_digest(version),
                hashlib.sha256(text.encode()).hexdigest(),
            )
        )
    policy["python_floor"] = str(
        min(Version(requires_python(lane.homeassistant)) for lane in lanes)
    )
    policy["python_latest"] = lanes[-1].python
    lanes.append(
        replace(lanes[-1], id="python-floor", role="python-floor", python=policy["python_floor"])
    )
    lanes.append(Lane("next", "next", "auto", "auto", "auto", "auto", "auto"))
    write_matrix(policy, lanes, root)
    directory = root / "scripts/requirements"
    directory.mkdir(exist_ok=True)
    for version, text in constraint_files.items():
        (directory / f"ha-{version}.constraints").write_text(text)
    update_claims(root)
    pydantic = pins(constraint_files[selected(lanes, "newest").homeassistant])["pydantic"]
    run([uv(), "lock", "--upgrade-package", f"pydantic=={pydantic}"], root)
    compile_lanes(root)
    return check(root)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("compile", "check", "next"):
        commands.add_parser(name)
    matrix = commands.add_parser("github-matrix")
    matrix.add_argument("--kind", choices=("ha", "core", "browser", "python-floor"), default="ha")
    rollover = commands.add_parser("roll")
    rollover.add_argument("minor")
    test = commands.add_parser("test")
    test.add_argument("--lane", required=True)
    test.add_argument("pytest_args", nargs=argparse.REMAINDER)
    args = parser.parse_args(argv)
    try:
        if args.command == "compile":
            compile_lanes()
            print("Compiled hashed HA lane requirements")
        elif args.command == "check":
            print(json.dumps(check()))
        elif args.command == "github-matrix":
            print(json.dumps(github_matrix(args.kind)))
        elif args.command == "next":
            print(json.dumps(next_release()))
        elif args.command == "roll":
            print(json.dumps(roll(args.minor)))
        else:
            values = args.pytest_args
            test_lane(args.lane, values[1:] if values[:1] == ["--"] else values)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
