"""Offline Occupied validation, deterministic previews, and typed ID migration."""

import argparse
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from .file_config import export_yaml, read_program
from .lighting import preview_handover, project_lighting
from .planner import preview_dates
from .time_utils import PlanningContext
from .validation import (
    ProgramError,
    behavior_hash,
    rename_identifier,
    validation_warnings,
)


def _context_options(parser):
    parser.add_argument(
        "--timezone", help="HA timezone context when the program uses home_assistant"
    )
    parser.add_argument("--latitude", type=float)
    parser.add_argument("--longitude", type=float)
    parser.add_argument("--elevation", type=float, default=0)


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(
        prog="occupied-config",
        description=(
            "Validate and preview Occupied's schema without Home Assistant or device calls."
        ),
    )
    commands = root.add_subparsers(dest="command", required=True)
    validate = commands.add_parser(
        "validate", help="Validate a file; optionally verify sampled date feasibility"
    )
    validate.add_argument("file", type=Path)
    validate.add_argument("--json", action="store_true")
    validate.add_argument("--date", type=date.fromisoformat)
    validate.add_argument("--days", type=int, default=1)
    validate.add_argument("--seed", default="0")
    _context_options(validate)
    preview = commands.add_parser(
        "preview", help="Export sampled UTC/local events, intervals, and explanations"
    )
    preview.add_argument("file", type=Path)
    preview.add_argument("--date", type=date.fromisoformat, required=True)
    preview.add_argument("--days", type=int, default=1)
    preview.add_argument("--seed", required=True)
    preview.add_argument(
        "--at", type=datetime.fromisoformat, help="Also project lighting at this aware ISO instant"
    )
    preview.add_argument(
        "--handover-at", type=datetime.fromisoformat, help="Also project handover endpoints"
    )
    preview.add_argument("--output", type=Path)
    _context_options(preview)
    rename = commands.add_parser(
        "rename-id", help="Emit a validated replacement with typed references rewritten"
    )
    rename.add_argument("file", type=Path)
    rename.add_argument("kind", choices=("group", "routine", "step", "activity", "window"))
    rename.add_argument("old")
    rename.add_argument("new")
    rename.add_argument("--output", type=Path)
    export = commands.add_parser("export", help="Emit normalized YAML with shared schema defaults")
    export.add_argument("file", type=Path)
    export.add_argument("--output", type=Path)
    return root


def _emit(text: str, output: Path | None = None):
    if output:
        output.write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        program = read_program(args.file)
        if args.command in {"rename-id", "export"}:
            if args.command == "rename-id":
                program = rename_identifier(program, args.kind, args.old, args.new)
            _emit(export_yaml(program), args.output)
            return 0
        result = {
            "valid": True,
            "behavior_hash": behavior_hash(program),
            "issues": [issue.to_dict() for issue in validation_warnings(program)],
        }
        if args.date is not None:
            if not 1 <= args.days <= 31:
                raise ValueError("--days must be between 1 and 31")
            context = PlanningContext(args.timezone, args.latitude, args.longitude, args.elevation)
            dates = [args.date + timedelta(days=index) for index in range(args.days)]
            plans = preview_dates(program, dates, args.seed, context=context)
            result["plans"] = [plan.to_dict() for plan in plans]
            result["valid"] = all(plan.feasible for plan in plans)
            if args.command == "preview":
                for instant, field in ((args.at, "lighting"), (args.handover_at, "handover")):
                    if instant is None:
                        continue
                    plan = next(
                        (
                            plan
                            for plan in plans
                            if instant.tzinfo is not None and plan.start <= instant <= plan.end
                        ),
                        None,
                    )
                    if plan is None:
                        raise ValueError(
                            f"{field} instant must be timezone aware and within the preview dates"
                        )
                    result[field] = (
                        {
                            entity: state.to_dict()
                            for entity, state in project_lighting(program, plan, instant).items()
                        }
                        if field == "lighting"
                        else preview_handover(program, plan, instant)
                    )
        if args.command == "preview" or args.json:
            _emit(
                json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
                getattr(args, "output", None),
            )
        else:
            print(
                f"{'Valid' if result['valid'] else 'Infeasible'} Occupied program: "
                f"{program.name} ({result['behavior_hash']})"
            )
            for issue in result["issues"]:
                print(f"{issue['severity']}: {issue['path']}: {issue['message']}")
            if "plans" in result:
                for plan in result["plans"]:
                    for issue in plan["issues"]:
                        if issue["severity"] == "error":
                            print(
                                f"error: {plan['simulation_date']} "
                                f"{issue['path']}: {issue['message']}"
                            )
        return 0 if result["valid"] else 2
    except (ProgramError, OSError, ValueError) as err:
        if isinstance(err, ProgramError):
            issues = [issue.to_dict() for issue in err.issues]
        else:
            issues = [
                {
                    "code": "input",
                    "message": str(err),
                    "path": "$",
                    "line": None,
                    "column": None,
                    "severity": "error",
                }
            ]
        if getattr(args, "json", False) or args.command == "preview":
            print(json.dumps({"valid": False, "issues": issues}, indent=2), file=sys.stderr)
        else:
            for issue in issues:
                location = f"{args.file}:{issue['line']}" if issue.get("line") else str(args.file)
                print(f"{location} {issue['path']}: {issue['message']}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
