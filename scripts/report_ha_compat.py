"""Maintain one compatibility issue after a scheduled probe fails; preserve human notes."""

import json
import os
import subprocess
import tempfile
from pathlib import Path

TITLE = "Home Assistant compatibility canary needs attention"
START = "<!-- occupied-canary:start -->"
END = "<!-- occupied-canary:end -->"
ROOT = Path(__file__).resolve().parents[1]


def gh(*arguments):
    return subprocess.check_output(
        ["gh", *arguments, "--repo", os.environ["GITHUB_REPOSITORY"]],
        cwd=ROOT,
        text=True,
    ).strip()


def report(candidate, results, run_url):
    if not any(job.get("result") == "failure" for job in results.values()):
        return None
    lines = [
        START,
        "The scheduled next-HA probe needs review.",
        "",
        f"Candidate: {candidate.get('homeassistant', 'discovery failed')}.",
        f"Python: {candidate.get('python', 'unknown')}.",
        f"Matching fixture: {candidate.get('phcc') or 'not published; fallback probe'}.",
        f"Stable patch lag: {candidate.get('stable_lag_days', 'unknown')} days (limit: 14).",
        "",
        *[f"- {name}: {job.get('result', 'unknown')}" for name, job in results.items()],
        "",
        f"[Workflow logs and artifacts]({run_url})",
        "",
        "This probe does not expand the supported matrix or change release requirements.",
        END,
    ]
    section = "\n".join(lines)
    issues = json.loads(
        gh(
            "issue",
            "list",
            "--state",
            "open",
            "--label",
            "ha-compat",
            "--limit",
            "100",
            "--json",
            "number,title,body",
        )
    )
    existing = next((issue for issue in issues if issue["title"] == TITLE), None)
    body = existing["body"] if existing else ""
    if START in body and END in body:
        body = body[: body.index(START)] + section + body[body.index(END) + len(END) :]
    else:
        body = body.rstrip() + ("\n\n" if body else "") + section
    with tempfile.TemporaryDirectory(prefix="occupied-compat-issue-") as temporary:
        path = Path(temporary) / "body.md"
        path.write_text(body + "\n")
        if existing:
            return gh("issue", "edit", str(existing["number"]), "--body-file", str(path))
        labels = json.loads(gh("label", "list", "--search", "ha-compat", "--json", "name"))
        if not any(label["name"] == "ha-compat" for label in labels):
            gh(
                "label",
                "create",
                "ha-compat",
                "--color",
                "D93F0B",
                "--description",
                "Upcoming Home Assistant compatibility",
            )
        return gh(
            "issue", "create", "--title", TITLE, "--label", "ha-compat", "--body-file", str(path)
        )


if __name__ == "__main__":
    result = report(
        json.loads(os.environ.get("CANDIDATE_METADATA") or "{}"),
        json.loads(os.environ["JOB_RESULTS"]),
        os.environ["WORKFLOW_URL"],
    )
    if result:
        print(result)
