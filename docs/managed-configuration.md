# Managed YAML and Puppet deployment

GUI storage, YAML snapshot import and managed-file authority are explicit choices. Snapshot import copies the program into a draft and GUI storage after saving. Managed mode reads a YAML file under HA's config directory, including a read-only mounted file, and keeps that file authoritative. Occupied never writes it or edits Puppet-managed configuration.

## Read, preview and change the source

Choose a file during native setup, use [unattended bootstrap](installation.md#unattended-managed-setup), or open **Occupied → Settings → Advanced settings**, select **Import, export and managed files**, and choose **Use managed file**. Enter its relative path. The complete candidate must validate and compile before replacing the saved program. Absolute paths, traversal and symlinks outside the config directory are rejected; files are bounded to 1 MiB and read in HA's executor.

File mode exposes the complete saved program. The routine builder finishes with **Add to draft**; forms, previews, ID migration and export can create a temporary draft. **Save changes** is disabled and both backend save/apply APIs enforce file authority. Export the draft, review/deploy the resulting YAML, then reload the managed source. Importing a local browser file does not select it as the managed source.

**Copy saved program to GUI storage** explicitly copies the current valid running program and changes authority. It leaves temporary draft edits separate; validate/save them afterward if desired. Invalid initial files must be corrected before they can be copied. Invalid source-switch candidates and stale revisions leave the existing source unchanged. Source switches keep one running engine and preserve already-started activity cleanup snapshots and deadlines.

## Reload and failure recovery

File metadata is polled every five seconds and changes are debounced for one second. Both in-place updates and atomic replacement are detected. Deployments that preserve inode, size and timestamps must call reload explicitly. Neither the watcher nor the runtime needs an open browser.

For immediate reload, use the panel button or this admin HA action:

```yaml
action: occupied.reload
data:
  config_entry_id: YOUR_OCCUPIED_ENTRY_ID
```

The action supports an optional response with `valid`, `changed`, source status and issue details. Invalid reloads without a response raise an actionable HA error. Admin WebSocket `occupied/reload` returns the same result; `occupied/source` requires `source: gui|file`, optional `config_file`, and the current `expected_revision`. Entry IDs are available in admin `config_entries/get` or HA's config entry selection UI.

Parse, schema, path/read and schedule-feasibility failures preserve the last valid **in-memory** program, queue and active cleanup. A Repair and source status distinguish an invalid observed update from the applied configuration. Correct the file and reload; the Repair clears after success. If HA starts with an invalid file, the entry stays inactive and never falls back to a saved GUI program. There is no persistent last-valid-file fallback; correct the managed source before restart if continued operation is needed.

Identical normalized programs are no-op reloads: sampled plans, sessions, pending work and handover/activity deadlines stay intact. Comments/formatting can change the observed/applied raw file hashes without changing the canonical revision. Metadata changes update labels while preserving plans. Behavioral changes replace future work atomically while retaining immutable ends of active owned activities. Reload and editor writes share a lock; invalid or concurrent drafts cannot silently overwrite another revision.

## Standalone CLI

Install the release wheel into a separate Python 3.14.2+ environment, for example:

```sh
python3.14 -m venv /opt/occupied
/opt/occupied/bin/pip install ./occupied-0.1.0-py3-none-any.whl
/opt/occupied/bin/occupied-config validate candidate.yaml --date today --days 7 --seed deploy --timezone Europe/Stockholm --latitude 59.3293 --longitude 18.0686
/opt/occupied/bin/occupied-config rename-id candidate.yaml step wake morning_wake --output reviewed.yaml
```

`today` uses the program's resolved timezone and simulation-day boundary. Provide the same HA timezone/location context as the installed engine when the program inherits them. CLI validation shares the model/planner and performs no device calls. The CLI's three direct dependencies are pinned independently of HA; it has no HA import or frontend build requirement.

For an authenticated immediate reload, store a HA admin long-lived access token in a restricted file. Pass the token file path rather than token contents:

```sh
/opt/occupied/bin/occupied-config reload --url https://ha.example --entry-id YOUR_OCCUPIED_ENTRY_ID --token-file /etc/occupied/ha.token
```

Use your final HA origin: redirects are refused. HTTPS is appropriate when the token crosses a network; loopback HTTP is supported. The request has a ten-second timeout, verifies the returned Occupied result, and exits 2 for invalid updates/transport errors. CLI output omits tokens, response bodies and source paths. Preview/validate/migrate remain entirely offline; this optional command is a one-shot deployment helper.

## Puppet example

The [example manifest](../examples/puppet/occupied.pp) manages only the source YAML and calls reload after a successful changed deployment. Preinstall the release CLI wheel and integration, provision the token file separately, and provide the exported program from your own Puppet module/Hiera. Set the owner and config directory to match your installation; for Container, the host directory must map under HA's `/config`.

Puppet's `file.validate_cmd` checks the candidate before replacement, using the same timezone/location and a seven-date preview. Failed validation retains the deployed file. Keep staging on the destination filesystem to support atomic replacement. A `refreshonly` reload subscribes to the file change and authenticates using the token file. The watcher makes redundant reloads harmless. The relevant resource semantics are documented in [Puppet's file/exec reference](https://help.puppet.com/core/current/Content/PuppetCore/Markdown/type.htm).

Bootstrap the household once through `configuration.yaml`, then let Puppet own the YAML. Do not manage HA's `.storage`. An existing GUI entry needs an explicit source switch. Export/rename operations emit reviewable YAML and do not edit the managed source unless an output destination is deliberately chosen.
