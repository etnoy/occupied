"""Compile, validate, reproduce, and roll the supported Home Assistant environments."""

import argparse
import hashlib
import importlib.metadata
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

import yaml
from packaging.requirements import Requirement
from packaging.utils import canonicalize_name
from packaging.version import Version

ROOT = Path(__file__).resolve().parents[1]
HA_ROLES = {"floor", "window", "newest"}
MATRIX_PATH = Path(".github/workflows/check.yml")
MATRIX_START = "        # ha-matrix:start\n"
MATRIX_END = "        # ha-matrix:end\n"


class MatrixDumper(yaml.SafeDumper):
    """Match workflow formatting while rewriting only the matrix block."""

    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)

    def represent_str(self, value):
        node = super().represent_str(value)
        if not value or self.resolve(yaml.ScalarNode, value, (True, False)) != node.tag:
            node.style = '"'
        return node


MatrixDumper.add_representer(str, MatrixDumper.represent_str)


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
    python_min: str = ""

    @property
    def stem(self):
        return f"ha-{self.homeassistant}"

    @property
    def header(self):
        digest = hashlib.sha256(json.dumps(asdict(self), sort_keys=True).encode()).hexdigest()
        return f"# Occupied lane: {self.id}; metadata-sha256={digest}"


def load(root=ROOT):
    workflow = yaml.safe_load((root / MATRIX_PATH).read_text())
    data = workflow["jobs"]["matrix"]["strategy"]["matrix"]["include"][0]
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
    if name != "python-floor":
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


def requirement_constraints(text):
    """Read exact and ranged official constraints for security repairs."""
    result = {}
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith(("#", "--")):
            continue
        try:
            requirement = Requirement(line.rstrip(" \\"))
        except Exception:
            continue
        name = canonicalize_name(requirement.name)
        if name in result:
            requirement = Requirement(f"{name}{result[name].specifier},{requirement.specifier}")
            exact = [s.version for s in requirement.specifier if s.operator == "=="]
            if len(exact) == 1 and Version(exact[0]) in requirement.specifier:
                requirement = Requirement(f"{name}=={exact[0]}")
        result[name] = requirement
    return result


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
    if any(lane.role not in HA_ROLES | {"python-floor"} for lane in lanes):
        raise ValueError("Unknown HA matrix lane role")
    python_floor = selected(lanes, "python-floor")
    if replace(python_floor, id=newest.id, role="newest", python=newest.python) != newest:
        raise ValueError("Python floor must use the newest HA environment")
    if python_floor.python != newest.python_min or newest.python != policy["python_latest"]:
        raise ValueError("Pinned Python versions disagree with the matrix policy")
    if policy["python_floor"] != str(min(Version(lane.python_min) for lane in actual)):
        raise ValueError("Standalone Python floor must equal the oldest HA Python requirement")
    if any(Version(lane.python) < Version(lane.python_min) for lane in actual):
        raise ValueError("HA interpreters must satisfy their minimum Python requirements")
    mise = tomllib.loads((root / "mise.toml").read_text())
    if mise["tools"]["python"] != policy["python_latest"]:
        raise ValueError("mise.toml Python must match the matrix's latest Python")
    hacs = json.loads((root / "hacs.json").read_text())
    if hacs["homeassistant"] != floor.homeassistant:
        raise ValueError("hacs.json must declare the HA floor lane")
    metadata = tomllib.loads((root / "pyproject.toml").read_text())
    project = metadata["project"]
    if project["requires-python"] != f">={policy['python_floor']}":
        raise ValueError("requires-python must equal the lowest supported Python")
    dev_python = metadata.get("tool", {}).get("uv", {}).get("dependency-groups", {}).get("dev", {})
    if dev_python.get("requires-python") != f">={newest.python_min}":
        raise ValueError("Dev group Python must equal the newest HA Python requirement")
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
            for requirement in compatibility_constraints(lane_pins):
                name = canonicalize_name(requirement.name)
                if name in resolved and Version(resolved[name]) not in requirement.specifier:
                    raise ValueError(f"{lane.id}: historical compatibility requires {requirement}")
            security = security_pins(policy, requirement_constraints(data.decode()))
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
            for name, version in lane_pins.items():
                if name in resolved and name not in security and resolved[name] != version:
                    raise ValueError(
                        f"{lane.id}: hashed {name} differs from HA's constraint {version}"
                    )
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
    result = {}
    for name, version in policy.get("security_overrides", {}).items():
        name = canonicalize_name(name)
        if name not in constrained:
            continue
        official = constrained[name]
        if isinstance(official, Requirement):
            exact = [s.version for s in official.specifier if s.operator == "=="]
            if not exact and any(
                s.operator in {">=", ">", "~="} and Version(s.version) >= Version(version)
                for s in official.specifier
            ):
                continue
            official = exact[0] if len(exact) == 1 else None
        if official is None or Version(official) < Version(version):
            result[name] = version
    return result


def check_installed(lane_id, root=ROOT):
    """Check dependencies, allowing only declared HA security-pin repairs."""
    policy, lanes = load(root)
    lane = next((item for item in lanes if item.id == lane_id), None)
    if lane is None:
        raise ValueError(f"Unknown HA lane: {lane_id}")
    result = subprocess.run(
        [uv(), "pip", "check", "--python", sys.executable], capture_output=True, text=True
    )
    if result.returncode == 0:
        print(result.stdout, end="")
        return

    official = requirement_constraints(constraints_path(root, lane).read_text())
    overrides = security_pins(policy, official)
    pattern = re.compile(
        r"The package `(?P<owner>[^`]+)` requires `(?P<requirement>[^`]+)`, "
        r"but `(?P<installed>[^`]+)` is installed"
    )
    unexpected = []
    allowed = 0
    for line in (result.stdout + result.stderr).splitlines():
        if line.startswith(("Checked ", "Found ", "Using Python ")) or not line:
            continue
        match = pattern.fullmatch(line)
        if not match or match.group("owner") != "homeassistant":
            unexpected.append(line)
            continue
        requirement = Requirement(match.group("requirement"))
        package = canonicalize_name(requirement.name)
        version = overrides.get(package)
        official_requirement = official.get(package)
        installed = match.group("installed")
        if (
            version is None
            or official_requirement is None
            or str(requirement.specifier) != str(official_requirement.specifier)
            or installed != version
            or importlib.metadata.version(package) != version
        ):
            unexpected.append(line)
        else:
            allowed += 1
    if unexpected or allowed == 0:
        raise RuntimeError(
            "Installed dependency check failed:\n"
            + "\n".join(unexpected or result.stdout.splitlines())
        )
    print(f"uv pip check: allowed declared security overrides for {', '.join(sorted(overrides))}")


def security_header(security):
    pins = ", ".join(f"{name}=={version}" for name, version in sorted(security.items()))
    return f"# Security overrides: {pins}; see README compatibility tooling notes"


def patched_constraints(source, security):
    """Preserve every official pin except explicitly recorded security repairs."""
    return (
        "\n".join(
            line
            for line in source.splitlines()
            if not (requirement_constraints(line).keys() & security.keys())
        )
        + "\n"
    )


def compatibility_constraints(constrained):
    """Constrain unbounded transitive APIs that predate their breaking release."""
    if "aiodns" in constrained and Version(constrained["aiodns"]) < Version("3.6"):
        # aiodns 3.5 evaluates pycares result types removed in pycares 5.
        return [Requirement("pycares<5")]
    return []


def overrides(lane, security=None):
    return (
        f"homeassistant=={lane.homeassistant}\n"
        f"pytest-homeassistant-custom-component=={lane.phcc}\n"
        f"home-assistant-frontend=={lane.frontend}\n"
    ) + "".join(f"{name}=={version}\n" for name, version in sorted((security or {}).items()))


def with_dev_python(source, minimum):
    """Keep the newest dev environment independent of the published CLI floor."""
    value = f'dev = {{requires-python = ">={minimum}"}}'
    if "[tool.uv.dependency-groups]" not in source:
        return source + f"\n[tool.uv.dependency-groups]\n{value}\n"
    source, count = re.subn(r'(?m)^dev = \{requires-python = "[^"]+"\}$', value, source)
    if count != 1:
        raise ValueError("Expected one dev Python requirement in pyproject.toml")
    return source


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
        security = security_pins(policy, requirement_constraints(path.read_text()))
        override_file.write_text(overrides(lane, security))
        requirement_file = path.with_suffix(".txt")
        expected.update((override_file.name, requirement_file.name))
        # Historical compiler inputs retain their interpreter floor and
        # apply only the security repairs explicitly recorded in the policy.
        with tempfile.TemporaryDirectory(prefix="occupied-compile-") as temporary:
            project = Path(temporary) / "pyproject.toml"
            project.write_text(
                with_dev_python((root / "pyproject.toml").read_text(), lane.python_min)
            )
            effective = Path(temporary) / path.name
            effective.write_text(
                patched_constraints(path.read_text(), security)
                + "".join(f"{r}\n" for r in compatibility_constraints(pins(path.read_text())))
            )
            _compile_lane(root, lane, project, override_file, effective, requirement_file)
            source = requirement_file.read_text().replace(str(project), "pyproject.toml")
            source = source.replace(str(effective), str(path.relative_to(root)))
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


def _compile_lane(root, lane, project, override_file, constraints, requirement_file):
    run(
        [
            uv(),
            "pip",
            "compile",
            project,
            "--group",
            f"{project}:dev",
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
        # Sample from the floor every six months, always including the newest
        # release even when the inclusive window is not a multiple of six.
        chosen = [
            lane for index, lane in enumerate(chosen) if index % 6 == 0 or lane.role == "newest"
        ]
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
        environment_variables = os.environ.copy()
        environment_variables["OCCUPIED_UV"] = uv()
        environment_variables["PATH"] = (
            str(environment / "bin") + os.pathsep + environment_variables["PATH"]
        )
        run(
            [python, "scripts/ha_matrix.py", "check-installed", "--lane", lane.id],
            root,
            env=environment_variables,
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
    ]

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


@cache
def latest_python(minimum):
    """Use stable CPython release tags within the HA-required interpreter family."""
    floor = Version(minimum)
    family = f"{floor.major}.{floor.minor}"
    refs = json.loads(
        fetch_text(f"https://api.github.com/repos/python/cpython/git/matching-refs/tags/v{family}.")
    )
    versions = [
        Version(ref["ref"].removeprefix("refs/tags/v"))
        for ref in refs
        if re.fullmatch(rf"refs/tags/v{re.escape(family)}\.\d+", ref["ref"])
    ]
    stable = [version for version in versions if version >= floor]
    if not stable:
        raise ValueError(f"No stable CPython release satisfies HA's Python floor {minimum}")
    return str(max(stable))


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
    python = latest_python(requirement)
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
    path = root / MATRIX_PATH
    source = path.read_text()
    data = {"format": 1, "policy": policy, "lanes": [asdict(lane) for lane in lanes]}
    rendered = yaml.dump({"include": [data]}, Dumper=MatrixDumper, sort_keys=False, width=1000)
    rendered = "".join("        " + line + "\n" for line in rendered.splitlines())
    start = source.index(MATRIX_START) + len(MATRIX_START)
    end = source.index(MATRIX_END, start)
    path.write_text(source[:start] + rendered + source[end:])


def update_claims(root=ROOT):
    policy, lanes = load(root)
    floor, newest = ha_lanes(lanes)[0], selected(lanes, "newest")
    path = root / "hacs.json"
    data = json.loads(path.read_text())
    data["homeassistant"] = floor.homeassistant
    path.write_text(json.dumps(data, indent=2) + "\n")
    path = root / "pyproject.toml"
    source = path.read_text()
    for name, version in (
        ("homeassistant", newest.homeassistant),
        ("pytest-homeassistant-custom-component", newest.phcc),
        ("home-assistant-frontend", newest.frontend),
    ):
        source = re.sub(rf'"{name}==[^\"]+"', f'"{name}=={version}"', source)
    source = re.sub(
        r'(?m)^requires-python = "[^"]+"', f'requires-python = ">={policy["python_floor"]}"', source
    )
    original = tomllib.loads(source)["project"]
    floor_pins = pins(constraints_path(root, floor).read_text())
    for raw in original["dependencies"]:
        name = canonicalize_name(Requirement(raw).name)
        if name in floor_pins:
            updated = re.sub(r">=[^,]+", f">={floor_pins[name]}", raw)
            source = source.replace(json.dumps(raw), json.dumps(updated))
    path.write_text(with_dev_python(source, newest.python_min))
    path = root / "custom_components/occupied/manifest.json"
    manifest = json.loads(path.read_text())
    manifest["requirements"] = [f"pydantic>={floor_pins['pydantic']}"]
    path.write_text(json.dumps(manifest, indent=2) + "\n")
    path = root / "mise.toml"
    source = path.read_text()
    source, count = re.subn(
        r'(?m)^python = "[^"]+"$', f'python = "{policy["python_latest"]}"', source
    )
    if count != 1:
        raise ValueError("Expected one pinned Python interpreter in mise.toml")
    path.write_text(source)


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
        python = latest_python(minimum)
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
                minimum,
            )
        )
    policy["python_floor"] = str(
        min(Version(requires_python(lane.homeassistant)) for lane in lanes)
    )
    policy["python_latest"] = lanes[-1].python
    latest = Version(policy["python_latest"])
    policy["python_next"] = f"{latest.major}.{latest.minor + 1}"
    lanes.append(
        replace(lanes[-1], id="python-floor", role="python-floor", python=lanes[-1].python_min)
    )
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
    installed = commands.add_parser("check-installed")
    installed.add_argument("--lane", required=True)
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
        elif args.command == "check-installed":
            check_installed(args.lane)
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
