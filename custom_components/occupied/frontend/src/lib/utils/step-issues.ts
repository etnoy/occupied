import type { Issue, StepEntry } from "../types.js";

// Keep warnings without a visible step in the panel's general issue list.
export function warningStepId(
  issue: Issue,
  entries: StepEntry[],
): string | undefined {
  if (issue.severity !== "warning") {
    return;
  }

  return entries.find((entry) =>
    issue.model_path
      ? entry.path.every((key, index) => issue.model_path?.[index] === key)
      : issue.path === `$.steps.${entry.id}` ||
        issue.path?.startsWith(`$.steps.${entry.id}.`),
  )?.id;
}
