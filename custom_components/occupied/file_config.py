"""Read-only Occupied YAML loader shared by deployment CLI and backend drafts."""

from dataclasses import replace
from hashlib import sha256
from pathlib import Path
from typing import Any

import yaml
from yaml.nodes import MappingNode, Node, SequenceNode

from .models import Program
from .validation import Issue, ModelPath, ProgramError, program_data, validate_program

MAX_FILE_BYTES = 1_048_576


def managed_path(config_dir: str, relative: str) -> Path:
    """Resolve on every read so replaced symlinks cannot escape the config directory."""
    root = Path(config_dir).resolve()
    path = Path(relative)
    if not relative.strip() or path.is_absolute() or ".." in path.parts:
        raise ProgramError(
            [Issue("file_path", "Choose a relative path under the HA config directory")]
        )
    resolved = (root / path).resolve()
    if not resolved.is_relative_to(root) or resolved == root:
        raise ProgramError(
            [Issue("file_path", "The managed file must remain under the HA config directory")]
        )
    return resolved


def file_fingerprint(config_dir: str, relative: str) -> tuple:
    try:
        stat = managed_path(config_dir, relative).stat()
        return stat.st_dev, stat.st_ino, stat.st_mtime_ns, stat.st_size
    except (OSError, ProgramError) as err:
        return (type(err).__name__, str(err))


def read_managed(config_dir: str, relative: str) -> tuple[str, str]:
    """Bounded, read-only source snapshot; the raw hash differs from the program revision."""
    path = managed_path(config_dir, relative)
    try:
        with path.open("rb") as stream:
            data = stream.read(MAX_FILE_BYTES + 1)
        if len(data) > MAX_FILE_BYTES:
            raise ProgramError([Issue("file_size", "Managed files must be at most 1 MiB")])
        return data.decode("utf-8"), sha256(data).hexdigest()
    except (OSError, UnicodeError) as err:
        raise ProgramError(
            [Issue("file_read", f"Cannot read Occupied configuration: {err}")]
        ) from err


def load_yaml(source: str) -> Program:
    loader = yaml.SafeLoader(source)
    locations: dict[ModelPath, tuple[int, int]] = {}

    def inspect(node: Node, path: ModelPath, ancestors: frozenset[int] = frozenset()) -> None:
        locations[path] = (node.start_mark.line + 1, node.start_mark.column + 1)
        if id(node) in ancestors:
            raise ProgramError(
                [
                    Issue(
                        "yaml_cycle",
                        "Recursive YAML aliases are not supported",
                        path,
                        line=node.start_mark.line + 1,
                    )
                ]
            )
        ancestors = ancestors | {id(node)}
        if isinstance(node, MappingNode):
            seen = set()
            for key, value in node.value:
                if key.tag == "tag:yaml.org,2002:merge":
                    raise ProgramError(
                        [
                            Issue(
                                "yaml_merge",
                                "Use shared schema defaults instead of YAML merge keys",
                                path,
                                line=key.start_mark.line + 1,
                            )
                        ]
                    )
                if key.tag != "tag:yaml.org,2002:str":
                    raise ProgramError(
                        [
                            Issue(
                                "yaml_key",
                                "Configuration keys must be strings",
                                path,
                                line=key.start_mark.line + 1,
                            )
                        ]
                    )
                if key.value in seen:
                    raise ProgramError(
                        [
                            Issue(
                                "duplicate_key",
                                f"Duplicate YAML key {key.value}",
                                path + (key.value,),
                                line=key.start_mark.line + 1,
                                column=key.start_mark.column + 1,
                            )
                        ]
                    )
                seen.add(key.value)
                inspect(value, path + (key.value,), ancestors)
        elif isinstance(node, SequenceNode):
            for index, child in enumerate(node.value):
                inspect(child, path + (index,), ancestors)

    try:
        node = loader.get_single_node()
        if node is None:
            raise ProgramError([Issue("yaml_empty", "The Occupied program is empty", line=1)])
        inspect(node, ())
        data = loader.construct_document(node)
        if not isinstance(data, dict):
            raise ProgramError(
                [Issue("yaml_root", "An Occupied program must be a mapping", line=1)]
            )
        return validate_program(data)
    except yaml.YAMLError as err:
        mark = getattr(err, "problem_mark", None)
        raise ProgramError(
            [
                Issue(
                    "yaml_syntax",
                    str(err),
                    line=mark.line + 1 if mark else None,
                    column=mark.column + 1 if mark else None,
                )
            ]
        ) from err
    except ProgramError as err:
        located = []
        for issue in err.issues:
            path = issue.path
            while path and path not in locations:
                path = path[:-1]
            line, column = locations.get(path, (1, 1))
            located.append(replace(issue, line=issue.line or line, column=issue.column or column))
        raise ProgramError(located) from err
    finally:
        loader.dispose()


def load_program(source: str | dict[str, Any] | Program) -> Program:
    return load_yaml(source) if isinstance(source, str) else validate_program(source)


def read_program(path: str | Path) -> Program:
    """No writes to a managed source; HA callers must use the executor."""
    try:
        source = Path(path).read_text(encoding="utf-8")
    except (OSError, UnicodeError) as err:
        raise ProgramError(
            [Issue("file_read", f"Cannot read Occupied configuration: {err}")]
        ) from err
    return load_yaml(source)


def export_yaml(program: Program) -> str:
    return yaml.safe_dump(program_data(program), allow_unicode=True, sort_keys=False)
