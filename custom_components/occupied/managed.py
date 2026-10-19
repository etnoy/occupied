"""One source controller; managed YAML is read only and changes are serialized."""

import asyncio
from datetime import timedelta

from homeassistant.core import callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.event import async_call_later, async_track_time_interval

from .bootstrap import check_bootstrap
from .const import DOMAIN
from .entry_metadata import async_sync_program_name
from .file_config import file_fingerprint, load_yaml, managed_path, read_managed
from .validation import ProgramError, RevisionConflict, program_revision

POLL_INTERVAL = timedelta(seconds=5)
DEBOUNCE_SECONDS = 1


def source_lock(hass, entry_id):
    return hass.data[DOMAIN].setdefault("editor_locks", {}).setdefault(entry_id, asyncio.Lock())


async def async_path_in_use(hass, path, *, exclude_entry_id=None):
    """Resolve current file owners off the event loop, including unloaded entries."""
    paths = [
        entry.data.get("config_file")
        for entry in hass.config_entries.async_entries(DOMAIN)
        if entry.entry_id != exclude_entry_id and entry.data.get("source") == "file"
    ]
    config_dir = hass.config.config_dir

    def check():
        try:
            selected = managed_path(config_dir, path)
        except ProgramError:
            # Bootstrap keeps invalid paths loadable for the normal Repairs flow.
            return False
        for existing in paths:
            try:
                if existing is not None and managed_path(config_dir, existing) == selected:
                    return True
            except ProgramError:
                continue
        return False

    return await hass.async_add_executor_job(check)


class SourceManager:
    """Retain the last valid in-memory program on errors; never write a source file."""

    def __init__(self, hass, entry, engine, *, recovery=None):
        self.hass, self.entry, self.engine = hass, entry, engine
        self.mode = entry.data.get("source", "gui")
        self.path = entry.data.get("config_file") if self.mode == "file" else None
        self.recovery = recovery
        self.status = "error" if recovery else "unresolved" if self.mode == "file" else "ready"
        self.observed_hash = self.applied_hash = None
        self.issues = recovery["issues"] if recovery else []
        self._fingerprint = None
        self._watched_source = self.mode, self.path
        self._unsubscribe = self._debounce = None
        self._checking = False
        self.closed = False
        engine.source_manager = self
        engine._unsubs.append(self.close)

    @property
    def recovery_revision(self):
        return self.recovery["revision"] if self.recovery else None

    def clear_recovery(self):
        if self.recovery is None:
            return
        self.recovery = None
        self.issues = []
        self.status = "ready"
        ir.async_delete_issue(self.hass, DOMAIN, f"invalid_program_{self.entry.entry_id}")

    def snapshot(self):
        return {
            "mode": self.mode,
            "status": self.status,
            "config_file": self.path,
            "observed_hash": self.observed_hash,
            "applied_hash": self.applied_hash,
            "issues": self.issues,
            "read_only": self.mode == "file",
            "has_valid_program": self.engine.configuration_ready,
        }

    def _report(self, issues):
        if self.closed or self.engine.closed:
            return
        self.issues = issues
        self.status = "error" if issues else "ready"
        issue_id = f"managed_file_{self.entry.entry_id}"
        if issues:
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                issue_id,
                is_fixable=False,
                severity=ir.IssueSeverity.ERROR,
                translation_key="managed_file",
                translation_placeholders={"path": str(self.path), "error": issues[0]["message"]},
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, issue_id)
        self.engine._notify()

    async def _candidate(self, path):
        text, digest = await self.hass.async_add_executor_job(
            read_managed, self.hass.config.config_dir, path
        )
        program = await self.hass.async_add_executor_job(load_yaml, text)
        return program, digest

    async def async_reload(self):
        """Idempotent normalized reload, including raw changes and error recovery."""
        async with source_lock(self.hass, self.entry.entry_id):
            if self.closed or self.engine.closed:
                raise HomeAssistantError(
                    "Occupied is unloaded", translation_domain=DOMAIN, translation_key="unloaded"
                )
            if self.mode != "file":
                raise HomeAssistantError(
                    "Select a managed file before reloading",
                    translation_domain=DOMAIN,
                    translation_key="select_managed_file",
                )
            changed = False
            fingerprint = await self.hass.async_add_executor_job(
                file_fingerprint, self.hass.config.config_dir, self.path
            )
            try:
                self.observed_hash = None
                text, self.observed_hash = await self.hass.async_add_executor_job(
                    read_managed, self.hass.config.config_dir, self.path
                )
                program = await self.hass.async_add_executor_job(load_yaml, text)
                if self.closed or self.engine.closed:
                    raise HomeAssistantError(
                        "Occupied is unloaded",
                        translation_domain=DOMAIN,
                        translation_key="unloaded",
                    )
                changed = not self.engine.configuration_ready or program_revision(
                    program
                ) != program_revision(self.engine.program)
                if changed:
                    await self.engine.async_replace_program(program, persist_program=False)
                self.applied_hash = self.observed_hash
                async_sync_program_name(self.hass, self.entry.entry_id, program.name)
                self._report([])
            except (ProgramError, HomeAssistantError) as err:
                if self.closed or self.engine.closed:
                    raise HomeAssistantError(
                        "Occupied is unloaded",
                        translation_domain=DOMAIN,
                        translation_key="unloaded",
                    ) from err
                issues = (
                    [i.to_dict() for i in err.issues]
                    if isinstance(err, ProgramError)
                    else [
                        {
                            "code": "reload_failed",
                            "path": "$",
                            "message": str(err),
                            "severity": "error",
                        }
                    ]
                )
                self._report(issues)
            # A file replaced during validation must be seen by the next poll.
            self._fingerprint = fingerprint
            return {
                "valid": not self.issues,
                "changed": changed and not self.issues,
                **self.snapshot(),
            }

    async def async_select(self, mode, path, expected_revision):
        """Explicit in-place source change; invalid candidates leave the source intact."""
        async with source_lock(self.hass, self.entry.entry_id):
            if self.closed or self.engine.closed:
                raise HomeAssistantError(
                    "Occupied is unloaded", translation_domain=DOMAIN, translation_key="unloaded"
                )
            if expected_revision != self.engine.source_revision:
                raise RevisionConflict("The program changed. Reload it before changing its source.")
            if mode == "file":
                if await async_path_in_use(self.hass, path, exclude_entry_id=self.entry.entry_id):
                    raise HomeAssistantError(
                        "Another Occupied controller already manages this file.",
                        translation_domain=DOMAIN,
                        translation_key="file_already_managed",
                    )
                program, digest = await self._candidate(path)
                await self.engine.async_replace_program(program, persist_program=False)
            else:
                if not self.engine.configuration_ready:
                    raise HomeAssistantError(
                        "Load a valid file before copying its program to GUI storage",
                        translation_domain=DOMAIN,
                        translation_key="valid_file_required",
                    )
                program, digest = self.engine.program, None
                await self.engine.async_replace_program(program)
            self.mode, self.path = mode, path if mode == "file" else None
            self.applied_hash = self.observed_hash = digest
            data = {**self.entry.data, "source": mode, "name": program.name}
            data.pop("config_file", None)
            if self.path:
                data["config_file"] = self.path
            # Daily entry data changes are handled here, without reloading the engine.
            self.hass.config_entries.async_update_entry(self.entry, data=data, title=program.name)
            check_bootstrap(self.hass, self.entry, self.hass.data[DOMAIN].get("bootstrap"))
            self._report([])
            self._watch()
            return self.snapshot()

    async def async_start(self):
        if self.mode == "file":
            await self.async_reload()
        issue_id = f"invalid_program_{self.entry.entry_id}"
        if self.recovery:
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                issue_id,
                is_fixable=False,
                severity=ir.IssueSeverity.ERROR,
                translation_key="invalid_program",
                translation_placeholders={
                    "name": self.entry.title,
                    "error": self.issues[0]["message"],
                },
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, issue_id)
        self._watch()

    def _watch(self):
        if self._unsubscribe:
            self._unsubscribe()
            self._unsubscribe = None
        if self._debounce:
            self._debounce()
            self._debounce = None
        source = self.mode, self.path
        if source != self._watched_source:
            self._fingerprint = None
            self._watched_source = source
        if self.mode == "file" and not self.closed:
            self._unsubscribe = async_track_time_interval(self.hass, self._poll, POLL_INTERVAL)

    async def _poll(self, _now):
        if self.closed or self._checking or self.mode != "file":
            return
        self._checking = True
        path = self.path
        try:
            fingerprint = await self.hass.async_add_executor_job(
                file_fingerprint, self.hass.config.config_dir, path
            )
            if self.closed or self.path != path or self.mode != "file":
                return
            if fingerprint != self._fingerprint:
                self._fingerprint = fingerprint
                if self._debounce:
                    self._debounce()
                self._debounce = async_call_later(self.hass, DEBOUNCE_SECONDS, self._reload_changed)
        finally:
            self._checking = False

    async def _reload_changed(self, _now):
        self._debounce = None
        if not self.closed and self.mode == "file":
            try:
                await self.async_reload()
            except HomeAssistantError:
                if not self.closed and not self.engine.closed:
                    raise

    @callback
    def close(self):
        self.closed = True
        for unsubscribe in (self._unsubscribe, self._debounce):
            if unsubscribe:
                unsubscribe()
        self._unsubscribe = self._debounce = None
