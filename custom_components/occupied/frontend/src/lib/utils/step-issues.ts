import type { Issue, RandomEntry, StepEntry } from "../types.js";

// Keep warnings without a visible card in the panel's general issue list.
function warningEntryId(
  issue: Issue,
  entries: Pick<StepEntry | RandomEntry, "id" | "path">[],
): string | undefined {
  if (issue.severity !== "warning" && issue.code !== "off_entity_conflict") {
    return;
  }

  return entries.find((entry) =>
    issue.model_path
      ? entry.path.every((key, index) => issue.model_path?.[index] === key)
      : issue.path === `$.${entry.path.join(".")}` ||
        issue.path?.startsWith(`$.${entry.path.join(".")}.`),
  )?.id;
}

export function warningStepId(issue: Issue, entries: StepEntry[]) {
  return warningEntryId(issue, entries);
}

export function warningRandomId(issue: Issue, entries: RandomEntry[]) {
  return warningEntryId(issue, entries);
}
