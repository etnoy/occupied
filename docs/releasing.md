# Release verification

Development and CI use Python 3.14.8. `uv.lock` pins the HA 2026.9.4 environment and plugin 0.13.367. `scripts/requirements-ha-2026.9.3.txt` independently pins/hashes HA 2026.9.3 and plugin 0.13.366. The older environment is resolved with the small explicit [override file](../scripts/ha-2026.9.3.overrides), without changing the baseline lock. The CLI has three direct dependencies and its installed wheel imports no HA module.

The initial release passes **242 Python tests with 91% coverage on each HA version**, five Node tests, and thirteen production-editor browser workflows at 1280px and 390px. Tests use real HA entry setup, storage, entities, state conditions, HTTP/WebSocket APIs, repairs and timers, with virtual device handlers. This includes invalid file recovery, file authority, idempotence, source conflicts/switches, atomic rename/debounce, immutable cleanup and managed startup/session recovery. Tests make no calls to an existing HA installation or physical hardware.

## Reproduce checks

```sh
uv sync --python 3.14.8 --locked
uv run ruff check custom_components tests scripts
uv run ruff format --check custom_components tests scripts
uv run pytest --cov=custom_components.occupied --cov-fail-under=88
uv run python scripts/check_release.py
npm ci --ignore-scripts
npm run format:check
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

The browser runner is a development/CI dependency, not a shipped runtime. It serves the production panel modules and real pure backend with a virtual runtime, runs the same workflow suite at two viewport widths, and fails on workflow or uncaught page errors. For interactive review, use the [browser fixture](editor.md#browser-acceptance-fixture). Stop any existing fixture server before starting the CI runner.

To reproduce the minimum HA suite in an independent environment:

```sh
uv venv /tmp/occupied-ha-2026.9.3 --python 3.14.8
uv pip sync --python /tmp/occupied-ha-2026.9.3/bin/python --require-hashes scripts/requirements-ha-2026.9.3.txt
/tmp/occupied-ha-2026.9.3/bin/pytest
```

JSON schema generation is checked against `Program.model_json_schema()`; semantic graph/resource/planner checks remain in the shared validator and CLI. Both representative examples must validate across a week, and each YAML/GUI round-trip must preserve behavior. The GUI fixture intentionally includes an additional exact state and a migrated ID compared with the hand-authored example.

## Artifacts and publication

`check.yml` runs the HA matrix, browser/Node tests, schema/assets/example checks, official hassfest and HACS validation. Only passing checks build/upload the release artifact. Official actions and development tools are pinned; hassfest/HACS validators track their upstream container images so newly incompatible HA requirements are reported. HACS validation does not post PR comments.

The package includes a deterministic `occupied.zip` (integration-root contents), a pure Python wheel, a source distribution with source fixtures/docs/locks, and `SHA256SUMS`. The zip/wheel contain all seven frontend modules, translations and local brand images. No user frontend build is involved. Build and inspect locally with:

```sh
uv build --out-dir dist
uv run python scripts/build_release.py
uv run python scripts/check_artifacts.py dist
```

Install the wheel in a clean environment and invoke its CLI from outside the repository to verify it does not accidentally import editable source. Verify a clean HA setup using the extracted zip. The built zip and wheel must contain identical runtime files. The source distribution must contain the fixtures/locks needed to reproduce checks.

Set matching manifest/project versions and add `docs/releases/<version>.md` before publication. Push an ordinary commit and confirm the Verify workflow passes. Then create/push `v<version>`. `release.yml` reruns all verification, checks tag/version and artifact checksums, and creates the GitHub release with those tested assets. It does not upload to PyPI or submit a HACS default-repository listing. HACS custom-repository installs use the tagged zip.

Physical-device timing, a full running-HA browser soak, and a hardware household-day soak remain deployment acceptance work. The checked matrix bounds compatibility claims; extend it with an independently pinned environment and actual test results when supporting another HA release.
