# Home Assistant compatibility maintenance

The supported window contains the current monthly Home Assistant release and the
five before it. `scripts/ha_matrix.toml` owns release/fixture/frontend pins,
interpreters, container digests, and roles. The newest environment uses `uv.lock`;
older environments use generated, hashed requirements and the official constraints
from their HA tags, with explicitly recorded security repairs. The oldest minor always starts at `.0`.

## Monthly rollover

Wait until the new stable minor, its matching
`pytest-homeassistant-custom-component` fixture, and HA container are published.
Use a feature branch from the latest main. The following is the November 2026
example; change the target minor for later months:

```sh
git fetch origin
git switch -c support/ha-2026.11 origin/main
uv sync --locked
uv run python scripts/ha_matrix.py next
uv run python scripts/ha_matrix.py roll 2026.11
uv run python scripts/ha_matrix.py check
```

`roll` discovers the latest patch with matching fixtures in each retained minor,
pins the new floor at `.0`, records official constraints and container digests,
updates the newest dev lock, and recompiles the older environments. It updates the
HACS minimum, README table, runtime dependency floors and Python floor together.
An unpublished fixture or image is a reason to wait. If resolution fails, keep the
changes on this branch and resolve the conflict before publishing the PR.

Read the generated diff. Check that exactly six consecutive minors remain, that
all hashes and digests correspond to the selected releases, that recorded security
repairs remain applied, and that no stale lane files remain. Remove every compatibility shim whose `remove_when_floor` has been
reached; the matrix check fails until this is done. Fix newly exposed deprecations
instead of weakening the tripwire. Bring historical-fixture security advisories to
review explicitly; keep dependency review enabled.

Run the complete gate documented in [Development](../README.md#development), then
reproduce all HA environments and the Python floor:

```sh
uv run python scripts/ha_matrix.py test --lane all
uv run python scripts/ha_matrix.py test --lane python-floor
pnpm exec playwright install chromium
```

With Docker running, run the browser smoke test for both matrix images after
building the release artifacts (`uv build` and `uv run python scripts/build_release.py`):

```sh
uv run python - <<'PY'
import os, subprocess, tomllib
from pathlib import Path
matrix = tomllib.loads(Path("scripts/ha_matrix.toml").read_text())
for lane in matrix["lanes"]:
    if lane["role"] in {"floor", "newest"}:
        subprocess.run(
            ["pnpm", "run", "test:browser"],
            env=os.environ | {"HA_IMAGE": lane["image"]},
            check=True,
        )
PY
```

Open one PR named, for example, **Support HA 2026.11, drop 2026.5**. Include the
old/new support range, dependency and Python changes, removed shims, and actual
validation results. Wait for every required CI job and maintainer review. The
release workflow derives its compatibility notes from the reviewed matrix.

## Between monthly rollovers

The **Next Home Assistant canary** runs daily at 04:17 UTC and can be started
manually from GitHub Actions. It runs outside required PR checks. Discovery picks
the newest beta/RC ahead of the supported matrix, or an untested stable patch.
The HA tests use an isolated, freshly resolved environment on the candidate's
required Python family; the browser uses the same HA tag in a disposable container.
These dynamic probes do not change the supported window or committed pins.

If no matching test fixture has been published, the Python probe uses the newest
supported fixture with its strict HA bound overridden. Its logs explicitly mark
this as a fallback and include the expected dependency-check mismatch; treat that
result as an early compatibility signal. A matching fixture requires a clean
dependency check. Artifacts retain discovery, constraints, resolved requirements,
JUnit, browser traces and HA logs for diagnosis.

A failure opens or updates one `ha-compat` issue with the failing jobs and workflow
link. Only its report job can write issues. Maintainer notes outside the managed
comment markers are preserved. Review and close the issue after the fix; healthy
runs leave it unchanged. A separate freshness check fails when a stable patch with
a published fixture has been available for more than 14 days, even if a newer
beta is also being probed. Backend and browser probes still run when freshness
fails. If discovery finds no newer release, both probes are skipped.

Use `ha_matrix.py next` and the daily compatibility report to find newer stable
patches and pre-releases. A stable patch is eligible for the newest tested lane
once its matching fixture is published. Change that lane's HA, fixture, frontend,
constraints hash and browser image together, including the duplicate Python-floor
metadata. Refresh generated support claims with
`uv run python -c 'from scripts.ha_matrix import update_claims; update_claims()'`,
update `uv.lock` with the HA-constrained pydantic version, and run `compile`,
`check`, the full gate and both browser endpoints before opening a patch PR.
Do not use `roll` to change a patch within the same minor; it deliberately requires
advancing the monthly window.

Dependabot handles ordinary dependency and action updates. It ignores the three
HA environment pins and excludes generated lane files. Keep these exclusions:
bumping one transitive pin in a hashed HA environment can violate the constraints
of the HA release being tested. Regenerate lane requirements with `ha_matrix.py
compile`; never edit package hashes by hand.

Security repairs are declared in `policy.security_overrides`. The compiler keeps
the original official constraints immutable, applies only the recorded replacement
to temporary compiler input, and records it in generated override/header files.
Dependency review stays enabled. A vulnerability in the historical HA release
itself requires an explicit support-policy decision; do not hide it with a blanket
advisory allowlist.


## Python maintenance

At rollover, the tool reads stable tags from the official CPython repository and
selects the latest patch in each lane's HA-required major/minor family. It updates
`mise.toml` and matrix policy together; CI reads its pins from that policy. The
matrix check rejects a stale mise interpreter. The standalone floor remains the
lowest requirement in the complete HA window, even when the newest lanes have
moved to a newer Python family. It rises only after the last older lane leaves.
The HA Python-floor job uses the newest HA release's own minimum, and its dev
dependency group has a separate Python bound. Historical requirements compile
against their recorded lane minimum, keeping the older environments reproducible.

The next-HA probe chooses the latest stable patch in the Python family required
by that candidate, including a newly required family. A rollover also advances
the experimental standalone lane to the Python minor after the newest required
family. Confirm that the pinned uv release can install the selected interpreters
before publishing the rollover PR.

Promote an experimental standalone Python only after both its tests and a fresh
wheels-only dependency resolution pass on CI. Move it into the required aggregate,
remove its experimental allowance, add the matching Python classifier, and update
the experimental release-note wording in that reviewed change.

Every October, revisit the six-release window using fresh
[Home Assistant analytics](https://analytics.home-assistant.io/). Record the data
retrieval date, install shares by minor, interpreter/API boundaries, and CI cost
in a review PR. Discuss any support-window change before changing the policy;
analytics coverage alone does not change compatibility automatically.
