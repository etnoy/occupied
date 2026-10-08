# Install, upgrade and remove Occupied

Occupied runs inside Home Assistant. Its editor, translations and brand images are included in each release; no frontend build or additional runtime process is required. The tested HA versions are **2026.9.3 and 2026.9.4**, with Python **3.14.8**. HA requires Python 3.14.2 or later. Later HA versions need compatibility verification before being added to the matrix.

## HACS custom repository

In HACS, open the three-dot menu → **Custom repositories**, add `https://github.com/etnoy/occupied`, and select **Integration**. Choose a published release and restart HA. HACS downloads the compiled `occupied.zip` release asset using its [ZIP release support](https://www.hacs.dev/docs/publish/start/). Custom repository steps follow the [HACS instructions](https://www.hacs.dev/docs/faq/custom_repositories/).

Open **Settings → Devices & services → Add integration → Occupied**. Choose GUI storage, a YAML snapshot, or an authoritative managed file. A new entry starts with permission disabled. Open the Occupied integration and select **Configure** to edit and preview routines, then select dry run before enabling permission. Activation conditions continue to apply to both dry and live execution.

HACS installs the compiled `occupied.zip` release asset. Development branch installs are disabled because the repository contains TypeScript sources; for development, run `npm ci` and `npm run build` before copying the integration.

## Manual installation

Download `occupied.zip` and `SHA256SUMS` from the [release page](https://github.com/etnoy/occupied/releases). Verify the archive checksum against its entry in `SHA256SUMS`. Extract the zip **inside** `<HA config>/custom_components/occupied/`: its root contains `manifest.json`, Python modules, `frontend/`, `translations/` and `brand/`. It does not contain another `occupied/` directory. Restart HA and add the integration as above.

Alternatively, copy the repository's complete `custom_components/occupied/` directory to the same location. HA installs the integration's Pydantic dependency. Astral and YAML support are supplied by HA. The standalone CLI wheel has its own pinned planner dependencies and does not install HA.

## Unattended managed setup

Install the integration and place your Occupied YAML under the HA config directory, for example `/config/occupied/house.yaml`. Add this to HA's `configuration.yaml` and restart:

```yaml
occupied:
  config_file: occupied/house.yaml
```

The path is relative to HA's config directory. A read-only container mount under that directory works. There is one household entry. Bootstrap creates that entry only when none exists; it never silently replaces a GUI household or another file selection. Resolve conflicts in **Occupied → Configuration** or remove the bootstrap declaration. Missing/invalid initial files leave an inactive, inspectable entry and create a HA Repair. Correct the file and reload to recover.

See [managed configuration and Puppet](managed-configuration.md) for reload, deployment, file authority and explicit source changes. The [editor guide](editor.md), [schema](schema.md) and [runtime guide](runtime.md) cover exact activation states, generic actions, timed activities, handover, ownership and recovery.

## Upgrade and backup

Back up HA before upgrading. GUI programs, permissions, random seed, sampled plans, journal and active activity snapshots are stored under HA's `.storage` and are included in HA config backups. Back up managed YAML separately with your configuration-management source. Never edit Occupied's stores directly.

Disable permission before replacing integration files, update the complete integration through HACS or manual extraction, then restart HA. For HACS installs from `main`, updating HACS downloads the latest commit from the default branch. Reloading the integration explicitly performs still-owned cleanup; a HA shutdown preserves active activity snapshots for restart recovery. Restore permission and review dry run after the upgrade. Source selection and GUI programs survive entry reload; unchanged managed programs retain deterministic saved plans and activity deadlines after restart. Preview rerolls never change the live seed.

Schema version 1 remains the supported program format. Unknown versions are rejected with actionable validation issues. Rename identifiers through the editor's **Migrate identifier** or `occupied-config rename-id`; labels can be changed without changing sampled times. Review emitted YAML before deploying it. Future schema/storage migrations must include tests and an upgrade note before release.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Occupied is missing | Directory must be `custom_components/occupied`, including manifest and bundled assets; restart HA and inspect setup logs. |
| File error in Configuration or Repairs | Correct the relative path, read permissions, UTF-8/YAML, schema or feasibility issue. Run CLI validation with HA timezone/location and `--date today --days 7`, then reload. |
| Bootstrap conflict | Existing source is retained. Select the source explicitly in Configuration, or remove the declaration before restarting. |
| File changes did not apply | Automatic detection polls file metadata every five seconds with a one-second debounce. Atomic rename is supported. Call `occupied.reload` for immediate reload or when a deploy preserves inode, size and timestamps. |
| Save is disabled | Validate the current draft. File mode requires export/update/reload, or an explicit copy of the saved program into GUI storage. A stale revision requires reloading the saved program. |
| Permission enabled, no activity | Inspect status reason, pause/dry mode, exact native activation states, unavailable resources, start/ownership predicates and the actual timeline. Past discrete starts are skipped. |
| Device cleanup was skipped or failed | Inspect ownership/manual changes and recorded outcomes. Cleanup never guesses inverse actions; failed or uncertain physical dispatch remains visible. |
| Runtime persistence failure | Resolve disk/storage permissions or capacity, then enable/resume to retry, or reload the entry. New dispatch stops while persistence is failing. |
| Editor assets look stale | Reload the browser after an integration upgrade; verify that all bundled frontend modules were replaced. |

Default diagnostics expose status and counts, including source mode/status, without household names, entity IDs, file paths or raw error text. Detailed diagnostics require an explicit admin-sensitive export; known credential fields remain redacted. Source errors are visible to admins through Configuration and HA Repairs.

## Uninstall

Remove the `occupied:` bootstrap declaration first so restart cannot recreate the entry. Stop permission and remove the entry through **Settings → Devices & services** while the integration code and device services are still available. Normal unload runs configured still-owned cleanup, cancels timers/watchers, removes the configuration panel and entities. Entry removal deletes its private program/permission/runtime stores and Repairs. The managed source file is retained.

Remove the integration through HACS or delete only `<HA config>/custom_components/occupied/`, then restart HA. Remove managed YAML and the optional CLI environment separately if no longer needed. A source file is never changed or deleted by Occupied.
