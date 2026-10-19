"""Support claims, reproducible environments, and rollover must move together."""

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from packaging.version import Version

from scripts import ha_matrix as matrix

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def matrix_repo(tmp_path, monkeypatch):
    """Fixed synthetic history keeps drift/rollover cases independent of live pins."""
    import hashlib

    policy = {
        "window": 6,
        "python_floor": "3.14.2",
        "python_latest": "3.14.8",
        "python_next": "3.15",
        "uv": "0.13.1",
    }
    rows = [
        ("2026.5.0", "0.13.329", "20260429.3", "2.13.2"),
        ("2026.6.4", "0.13.340", "20260527.7", "2.13.4"),
        ("2026.7.4", "0.13.348", "20260624.6", "2.13.4"),
        ("2026.8.3", "0.13.357", "20260729.7", "2.13.4"),
        ("2026.9.4", "0.13.367", "20260826.7", "2.13.4"),
        ("2026.10.1", "0.13.372", "20260930.3", "2.13.5"),
    ]
    monkeypatch.setattr(matrix, "latest_python", lambda _: "3.14.8")
    (tmp_path / "mise.toml").write_text('[tools]\npython = "3.14.8"\n')
    directory = tmp_path / "scripts/requirements"
    directory.mkdir(parents=True)
    lanes = []
    for index, (ha, phcc, frontend, pydantic) in enumerate(rows):
        role = "floor" if index == 0 else "newest" if index == 5 else "window"
        constraints = (
            f"pydantic=={pydantic}\nPyYAML==6.0.3\nastral==2.2\n"
            f"home-assistant-frontend=={frontend}\n"
        )
        lane = matrix.Lane(
            f"ha-{ha}",
            role,
            ha,
            phcc,
            frontend,
            "3.14.8",
            f"ghcr.io/home-assistant/home-assistant:{ha}@sha256:" + "a" * 64,
            hashlib.sha256(constraints.encode()).hexdigest(),
            python_min="3.14.2",
        )
        lanes.append(lane)
        path = directory / f"{lane.stem}.constraints"
        path.write_text(constraints)
        if role != "newest":
            path.with_suffix(".overrides").write_text(matrix.overrides(lane))
            path.with_suffix(".txt").write_text(
                lane.header
                + "\n"
                + matrix.overrides(lane)
                + constraints
                + "    --hash=sha256:"
                + "b" * 64
                + "\n"
            )
    from dataclasses import replace

    lanes.append(replace(lanes[-1], id="python-floor", role="python-floor", python="3.14.2"))
    workflow = tmp_path / matrix.MATRIX_PATH
    workflow.parent.mkdir(parents=True)
    workflow.write_text(
        "jobs:\n  matrix:\n    strategy:\n      matrix:\n" + matrix.MATRIX_START + matrix.MATRIX_END
    )
    matrix.write_matrix(policy, lanes, tmp_path)
    (tmp_path / "pyproject.toml").write_text(
        '[project]\nname = "occupied"\nversion = "0.0.0"\n'
        'requires-python = ">=3.14.2"\n'
        'dependencies = ["pydantic>=2.13.2,<3", "PyYAML>=6.0.3,<7", "astral>=2.2,<3"]\n'
        '[dependency-groups]\ndev = ["homeassistant==2026.10.1", '
        '"pytest-homeassistant-custom-component==0.13.372", '
        '"home-assistant-frontend==20260930.3"]\n'
        '[tool.uv.dependency-groups]\ndev = {requires-python = ">=3.14.2"}\n'
    )
    versions = {
        "homeassistant": "2026.10.1",
        "pytest-homeassistant-custom-component": "0.13.372",
        "home-assistant-frontend": "20260930.3",
        "pydantic": "2.13.5",
        "pyyaml": "6.0.3",
        "astral": "2.2",
    }
    (tmp_path / "uv.lock").write_text(
        "\n".join(
            f'[[package]]\nname = "{name}"\nversion = "{version}"'
            for name, version in versions.items()
        )
    )
    (tmp_path / "hacs.json").write_text(json.dumps({"homeassistant": "2026.5.0"}))
    (tmp_path / "README.md").write_text("# Occupied\n\nA human-readable introduction.\n")
    integration = tmp_path / "custom_components/occupied"
    integration.mkdir(parents=True)
    (integration / "manifest.json").write_text(json.dumps({"requirements": ["pydantic>=2.13.2"]}))
    (integration / "compat.py").write_text("# remove_when_floor: 2026.8.0\n")
    return tmp_path


def edit(root, name, before, after):
    path = root / name
    source = path.read_text()
    assert before in source
    path.write_text(source.replace(before, after))


def test_supported_matrix_is_consistent():
    assert matrix.check(ROOT)["lanes"] == 6


def test_ha_beta_test_lane_is_removed():
    _, lanes = matrix.load(ROOT)
    assert all(lane.role != "next" for lane in lanes)
    with pytest.raises(ValueError, match="Choose a unique HA lane"):
        matrix.selected(lanes, "next")


def test_workflow_matrix_roundtrip_preserves_workflow(tmp_path):
    path = tmp_path / matrix.MATRIX_PATH
    path.parent.mkdir(parents=True)
    original = (ROOT / matrix.MATRIX_PATH).read_bytes()
    path.write_bytes(original)
    policy, lanes = matrix.load(tmp_path)
    matrix.write_matrix(policy, lanes, tmp_path)
    assert path.read_bytes() == original


@pytest.mark.parametrize(
    "path,before,after,message",
    [
        ("hacs.json", "2026.5.0", "2026.10.0", "hacs.json"),
        (
            "pyproject.toml",
            'requires-python = ">=3.14.2"',
            'requires-python = ">=3.14.8"',
            "requires-python",
        ),
        ("pyproject.toml", "pydantic>=2.13.2,<3", "pydantic>=2.13.5,<3", "excludes HA"),
        ("pyproject.toml", "PyYAML>=6.0.3,<7", "PyYAML>=6.0.2,<7", "Runtime floor"),
        (
            "pyproject.toml",
            'dev = {requires-python = ">=3.14.2"}',
            'dev = {requires-python = ">=3.15.2"}',
            "Dev group Python",
        ),
        (
            "custom_components/occupied/manifest.json",
            "pydantic>=2.13.2",
            "pydantic>=2.13.2,<2.14",
            "only the HA-floor",
        ),
        (
            "uv.lock",
            'name = "homeassistant"\nversion = "2026.10.1"',
            'name = "homeassistant"\nversion = "2026.10.2"',
            "uv.lock homeassistant",
        ),
        (
            "uv.lock",
            'name = "pydantic"\nversion = "2.13.5"',
            'name = "pydantic"\nversion = "2.14.1"',
            "uv.lock pydantic",
        ),
    ],
)
def test_claim_and_runtime_drift_is_rejected(matrix_repo, path, before, after, message):
    edit(matrix_repo, path, before, after)
    with pytest.raises(ValueError, match=message):
        matrix.check(matrix_repo)


@pytest.mark.parametrize("readme", [None, "# A rewritten introduction\n"])
def test_matrix_check_and_updates_are_independent_of_readme(matrix_repo, readme):
    path = matrix_repo / "README.md"
    if readme is None:
        path.unlink()
    else:
        path.write_text(readme)
    assert matrix.check(matrix_repo)["lanes"] == 6
    matrix.update_claims(matrix_repo)
    assert matrix.check(matrix_repo)["lanes"] == 6
    if readme is None:
        assert not path.exists()
    else:
        assert path.read_text() == readme


def test_missing_lane_file_is_rejected(matrix_repo):
    (matrix_repo / "scripts/requirements/ha-2026.5.0.txt").unlink()
    with pytest.raises(FileNotFoundError):
        matrix.check(matrix_repo)


def test_stale_lane_file_is_rejected(matrix_repo):
    (matrix_repo / "scripts/requirements/ha-2026.4.0.txt").write_text("obsolete")
    with pytest.raises(ValueError, match="Stale HA lane"):
        matrix.check(matrix_repo)


def test_constraint_tampering_is_rejected(matrix_repo):
    path = matrix_repo / "scripts/requirements/ha-2026.5.0.constraints"
    path.write_text(path.read_text() + "\n# changed\n")
    with pytest.raises(ValueError, match="constraints digest"):
        matrix.check(matrix_repo)


def test_outdated_requirements_header_is_rejected(matrix_repo):
    path = matrix_repo / "scripts/requirements/ha-2026.5.0.txt"
    path.write_text("# obsolete lane metadata\n" + path.read_text())
    with pytest.raises(ValueError, match="header or hashes"):
        matrix.check(matrix_repo)


def test_hashed_runtime_pin_drift_is_rejected(matrix_repo):
    edit(
        matrix_repo, "scripts/requirements/ha-2026.5.0.txt", "pydantic==2.13.2", "pydantic==2.13.5"
    )
    with pytest.raises(ValueError, match="hashed runtime pydantic"):
        matrix.check(matrix_repo)


def test_expired_compatibility_shim_is_rejected(matrix_repo):
    (matrix_repo / "custom_components/occupied/expired.py").write_text(
        "# remove_when_floor: 2026.5.0\n"
    )
    with pytest.raises(ValueError, match="Remove expired compatibility shim"):
        matrix.check(matrix_repo)


def test_github_matrices_cover_ha_browser_and_python_roles(matrix_repo):
    ha = matrix.github_matrix(root=matrix_repo)["include"]
    assert len(ha) == 6
    assert ha[0]["role"] == "floor" and ha[-1]["role"] == "newest"
    browser = matrix.github_matrix("browser", matrix_repo)["include"]
    assert [row["role"] for row in browser] == ["floor", "newest"]
    assert all("@sha256:" in row["image"] for row in browser)
    python_floor = matrix.github_matrix("python-floor", matrix_repo)["include"]
    assert python_floor[0]["python"] == "3.14.2"
    core = matrix.github_matrix("core", matrix_repo)["include"]
    assert [(row["python"], row["experimental"]) for row in core] == [
        ("3.14.2", False),
        ("3.14.8", False),
        ("3.15", True),
    ]


def test_next_prefers_prerelease_and_detects_overdue_stable_patch(monkeypatch, matrix_repo):
    monkeypatch.setattr(
        matrix,
        "published_versions",
        lambda _: [Version("2026.11.0b0"), Version("2026.10.3"), Version("2026.10.1")],
    )
    monkeypatch.setattr(
        matrix, "matching_phcc", lambda version: "0.13.375" if version == "2026.10.3" else None
    )
    monkeypatch.setattr(matrix, "requires_python", lambda _: "3.14.2")
    monkeypatch.setattr(matrix, "fetch_text", lambda _: "home-assistant-frontend==20261015.1\n")
    published = (datetime.now(UTC) - timedelta(days=20)).isoformat()
    monkeypatch.setattr(
        matrix,
        "package_json",
        lambda *args: {"urls": [{"upload_time_iso_8601": published, "yanked": False}]},
    )
    candidate = matrix.next_release(matrix_repo)
    assert candidate["homeassistant"] == "2026.11.0b0"
    assert candidate["phcc"] is None
    assert candidate["fallback_phcc"] == "0.13.372"
    assert candidate["stale"] and candidate["stable_lag_days"] >= 20


def test_next_falls_back_to_stable_without_matching_fixture(monkeypatch, matrix_repo):
    monkeypatch.setattr(matrix, "published_versions", lambda _: [Version("2026.10.2")])
    monkeypatch.setattr(matrix, "matching_phcc", lambda _: None)
    monkeypatch.setattr(matrix, "requires_python", lambda _: "3.14.2")
    monkeypatch.setattr(matrix, "fetch_text", lambda _: "home-assistant-frontend==20260930.4\n")
    candidate = matrix.next_release(matrix_repo)
    assert candidate["available"] and candidate["homeassistant"] == "2026.10.2"
    assert candidate["phcc"] is None and not candidate["stale"]


def test_next_has_no_work_when_matrix_is_current(monkeypatch, matrix_repo):
    monkeypatch.setattr(matrix, "published_versions", lambda _: [Version("2026.10.1")])
    assert matrix.next_release(matrix_repo) == {
        "available": False,
        "stable_lag_days": 0,
        "stale": False,
    }


@pytest.mark.parametrize("minor", ["2026.10", "2026-11", "2026.13"])
def test_roll_rejects_invalid_or_nonadvancing_minor(minor, matrix_repo):
    with pytest.raises(ValueError):
        matrix.roll(minor, matrix_repo)


def test_roll_requires_matching_fixture_before_changing_files(monkeypatch, matrix_repo):
    before = (matrix_repo / matrix.MATRIX_PATH).read_bytes()
    monkeypatch.setattr(matrix, "published_versions", lambda _: [Version("2026.6.0")])
    monkeypatch.setattr(matrix, "matching_phcc", lambda _: None)
    with pytest.raises(ValueError, match="no published matching test fixture"):
        matrix.roll("2026.11", matrix_repo)
    assert (matrix_repo / matrix.MATRIX_PATH).read_bytes() == before


@pytest.mark.parametrize("python_change", ["patch", "mixed", "floor"])
def test_roll_advances_window_and_updates_generated_claims(monkeypatch, matrix_repo, python_change):
    versions = [
        "2026.11.0",
        "2026.10.2",
        "2026.9.4",
        "2026.8.3",
        "2026.7.4",
        "2026.6.4",
        "2026.6.0",
    ]
    monkeypatch.setattr(matrix, "published_versions", lambda _: list(map(Version, versions)))
    monkeypatch.setattr(matrix, "matching_phcc", lambda v: f"0.13.{400 + Version(v).minor}")
    monkeypatch.setattr(
        matrix,
        "requires_python",
        lambda version: (
            "3.15.2"
            if python_change == "floor" or (python_change == "mixed" and version == "2026.11.0")
            else "3.14.2"
        ),
    )
    monkeypatch.setattr(
        matrix, "latest_python", lambda minimum: "3.15.3" if minimum == "3.15.2" else "3.14.9"
    )
    monkeypatch.setattr(
        matrix,
        "image_digest",
        lambda v: f"ghcr.io/home-assistant/home-assistant:{v}@sha256:" + "a" * 64,
    )
    constraints = (
        "pydantic==2.13.4\nPyYAML==6.0.3\nastral==2.2\nhome-assistant-frontend==20261030.1\n"
    )
    monkeypatch.setattr(matrix, "fetch_text", lambda _: constraints)
    commands = []
    monkeypatch.setattr(matrix, "run", lambda command, *args, **kwargs: commands.append(command))
    compiled = []
    monkeypatch.setattr(matrix, "compile_lanes", lambda root: compiled.append(root))
    monkeypatch.setattr(matrix, "check", lambda root: {"lanes": 6})
    readme = (matrix_repo / "README.md").read_bytes()
    assert matrix.roll("2026.11", matrix_repo) == {"lanes": 6}
    assert (matrix_repo / "README.md").read_bytes() == readme
    policy, lanes = matrix.load(matrix_repo)
    ha = matrix.ha_lanes(lanes)
    assert all(lane.role != "next" for lane in lanes)
    assert ha[0].homeassistant == "2026.6.0" and ha[0].role == "floor"
    assert ha[-1].homeassistant == "2026.11.0" and ha[-1].role == "newest"
    assert ha[-2].homeassistant == "2026.10.2"
    assert len(ha) == 6 and all(not lane.homeassistant.startswith("2026.5") for lane in ha)
    assert json.loads((matrix_repo / "hacs.json").read_text())["homeassistant"] == "2026.6.0"
    assert "pydantic>=2.13.4,<3" in (matrix_repo / "pyproject.toml").read_text()
    latest = "3.14.9" if python_change == "patch" else "3.15.3"
    assert policy["python_latest"] == latest
    assert policy["python_floor"] == ("3.15.2" if python_change == "floor" else "3.14.2")
    assert policy["python_next"] == ("3.15" if python_change == "patch" else "3.16")
    assert matrix.selected(lanes, "python-floor").python == (
        "3.14.2" if python_change == "patch" else "3.15.2"
    )
    assert f'python = "{latest}"' in (matrix_repo / "mise.toml").read_text()
    assert (
        f'requires-python = ">={policy["python_floor"]}"'
        in (matrix_repo / "pyproject.toml").read_text()
    )
    if python_change == "mixed":
        assert ha[0].python == "3.14.9" and ha[-1].python == "3.15.3"
    assert compiled == [matrix_repo]
    assert any("pydantic==2.13.4" in command for command in commands)


@pytest.fixture
def security_matrix_repo(matrix_repo):
    import hashlib
    from dataclasses import replace

    policy, lanes = matrix.load(matrix_repo)
    updated = []
    for lane in lanes:
        if lane.role not in {"floor", "window", "newest"}:
            updated.append(lane)
            continue
        path = matrix.constraints_path(matrix_repo, lane)
        path.write_text(path.read_text() + "anyio==4.13.0\n")
        updated_lane = replace(
            lane, constraints_sha256=hashlib.sha256(path.read_bytes()).hexdigest()
        )
        updated.append(updated_lane)
        if lane.role != "newest":
            path.with_suffix(".txt").write_text(
                updated_lane.header
                + "\n"
                + path.with_suffix(".txt").read_text().split("\n", 1)[1]
                + "anyio==4.13.0\n    --hash=sha256:"
                + "c" * 64
                + "\n"
            )
    newest = matrix.selected(updated, "newest")
    updated = [
        replace(newest, id="python-floor", role="python-floor", python=policy["python_floor"])
        if lane.role == "python-floor"
        else lane
        for lane in updated
    ]
    policy["security_overrides"] = {"anyio": "4.14.2"}
    matrix.write_matrix(policy, updated, matrix_repo)
    return matrix_repo


def test_vulnerable_historical_fixture_pin_is_rejected(security_matrix_repo):
    with pytest.raises(ValueError, match="security override"):
        matrix.check(security_matrix_repo)


def test_patched_fixture_preserves_official_constraints_and_roundtrips_policy(security_matrix_repo):
    policy, lanes = matrix.load(security_matrix_repo)
    original = {
        path.name: path.read_bytes()
        for path in (security_matrix_repo / "scripts/requirements").glob("*.constraints")
    }
    for lane in matrix.ha_lanes(lanes):
        if lane.role == "newest":
            continue
        path = matrix.constraints_path(security_matrix_repo, lane)
        security = matrix.security_pins(policy, matrix.pins(path.read_text()))
        path.with_suffix(".overrides").write_text(matrix.overrides(lane, security))
        path.with_suffix(".txt").write_text(
            lane.header
            + "\n"
            + matrix.security_header(security)
            + "\n"
            + matrix.overrides(lane, security)
            + matrix.patched_constraints(path.read_text(), security)
            + "    --hash=sha256:"
            + "c" * 64
            + "\n"
        )
    assert matrix.check(security_matrix_repo)["lanes"] == 6
    matrix.write_matrix(policy, lanes, security_matrix_repo)
    assert matrix.load(security_matrix_repo)[0]["security_overrides"] == {"anyio": "4.14.2"}
    assert original == {
        path.name: path.read_bytes()
        for path in (security_matrix_repo / "scripts/requirements").glob("*.constraints")
    }
    assert matrix.security_pins(policy, {"anyio": "4.15.1"}) == {}


def test_mise_python_must_match_the_matrix_policy(matrix_repo):
    (matrix_repo / "mise.toml").write_text('[tools]\npython = "3.14.7"\n')
    with pytest.raises(ValueError, match="mise.toml Python"):
        matrix.check(matrix_repo)


def test_latest_python_uses_stable_tags_in_the_required_family(monkeypatch):
    requests = []

    def releases(url):
        requests.append(url)
        return json.dumps(
            [{"ref": "refs/tags/v3.14." + suffix} for suffix in ("2", "8", "9", "10rc1")]
            + [{"ref": "refs/tags/v3.15.0"}]
        )

    matrix.latest_python.cache_clear()
    monkeypatch.setattr(matrix, "fetch_text", releases)
    try:
        assert matrix.latest_python("3.14.2") == "3.14.9"
        assert requests == [
            "https://api.github.com/repos/python/cpython/git/matching-refs/tags/v3.14."
        ]
        with pytest.raises(ValueError, match="No stable CPython release"):
            matrix.latest_python("3.14.10")
    finally:
        matrix.latest_python.cache_clear()


def test_next_switches_to_the_new_ha_python_family(monkeypatch, matrix_repo):
    monkeypatch.setattr(matrix, "published_versions", lambda _: [Version("2026.11.0b0")])
    monkeypatch.setattr(matrix, "matching_phcc", lambda _: "0.13.380")
    monkeypatch.setattr(matrix, "requires_python", lambda _: "3.15.2")
    monkeypatch.setattr(matrix, "latest_python", lambda minimum: "3.15.3")
    monkeypatch.setattr(matrix, "fetch_text", lambda _: "home-assistant-frontend==20261015.1\n")
    candidate = matrix.next_release(matrix_repo)
    assert candidate["python"] == "3.15.3" and candidate["requires_python"] == "3.15.2"


def test_historical_compile_uses_its_own_python_floor(monkeypatch, matrix_repo):
    import tomllib

    edit(
        matrix_repo,
        "pyproject.toml",
        'dev = {requires-python = ">=3.14.2"}',
        'dev = {requires-python = ">=3.15.2"}',
    )
    compiled = []

    def compiler(command, root, **kwargs):
        project = Path(command[3])
        metadata = tomllib.loads(project.read_text())
        assert metadata["tool"]["uv"]["dependency-groups"]["dev"]["requires-python"] == ">=3.14.2"
        output = root / command[command.index("--output-file") + 1]
        output.write_text(f"pytest==9.1.1\n    # via occupied ({project}:dev)\n")
        compiled.append(output)

    monkeypatch.setattr(matrix, "run", compiler)
    matrix.compile_lanes(matrix_repo)
    assert len(compiled) == 5
    before = {path.name: path.read_bytes() for path in compiled}
    assert all("pyproject.toml:dev" in path.read_text() for path in compiled)
    assert all("occupied-compile-" not in path.read_text() for path in compiled)
    matrix.compile_lanes(matrix_repo)
    assert before == {path.name: path.read_bytes() for path in compiled}
