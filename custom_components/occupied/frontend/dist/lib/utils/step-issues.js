// Generated from custom_components/occupied/frontend/src/lib/utils/step-issues.ts by pnpm run build. Do not edit.
// Keep warnings without a visible card in the panel's general issue list.
function warningEntryId(issue, entries) {
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
export function warningStepId(issue, entries) {
  return warningEntryId(issue, entries);
}
export function warningRandomId(issue, entries) {
  return warningEntryId(issue, entries);
}
