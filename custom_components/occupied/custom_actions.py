"""Strict action-block parsing for the GUI, using the managed-file YAML loader."""

from dataclasses import replace

from .file_config import load_yaml
from .validation import ProgramError, program_data, validate_program


def parse_action_yaml(source):
    def validate(data):
        sequence = isinstance(data, list)
        actions = data if sequence else [data]
        try:
            program = validate_program(
                {
                    "schema_version": 1,
                    "name": "Custom YAML",
                    "steps": {
                        "custom": {
                            "timing": {"absolute_time": {"start": "12:00"}},
                            "actions": actions,
                        }
                    },
                }
            )
        except ProgramError as err:
            issues = []
            for issue in err.issues:
                path = issue.path
                if path[:3] == ("steps", "custom", "actions"):
                    path = path[3:]
                    if not sequence and path and path[0] == 0:
                        path = path[1:]
                elif path[:2] == ("steps", "custom"):
                    path = ()
                issues.append(replace(issue, path=path))
            raise ProgramError(issues) from err
        return {"actions": program_data(program)["steps"]["custom"]["actions"]}

    return load_yaml(source, validator=validate)
