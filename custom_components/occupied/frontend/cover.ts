import type { Action, JsonValue } from "./types.js";

export const coverActions: [string, string][] = [
  ["cover.open_cover", "Open cover"],
  ["cover.close_cover", "Close cover"],
  ["cover.stop_cover", "Stop cover"],
  ["cover.set_cover_position", "Set cover position"],
  ["cover.open_cover_tilt", "Open tilt"],
  ["cover.close_cover_tilt", "Close tilt"],
  ["cover.stop_cover_tilt", "Stop tilt"],
  ["cover.set_cover_tilt_position", "Set tilt position"],
];

export function coverField(action: string) {
  if (action === "cover.set_cover_position") {
    return "position";
  }
  if (action === "cover.set_cover_tilt_position") {
    return "tilt_position";
  }
  return;
}

export function isCoverAction(action: Pick<Action, "action" | "data">) {
  const field = coverField(action.action);
  return (
    coverActions.some(([service]) => service === action.action) &&
    Object.keys(action.data || {}).every((key) => key === field) &&
    (!field || validCoverPosition(action.data?.[field]))
  );
}

function validCoverPosition(value: JsonValue | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 100
  );
}

export interface CoverPosition {
  position?: number;
  tilt_position?: number;
}

// These are authored targets, without inferred travel times or stop positions.
export function coverTarget(
  action: Pick<Action, "action" | "data">,
  previous: CoverPosition = {},
): CoverPosition {
  if (!isCoverAction(action)) {
    return {};
  }
  const next = { ...previous };
  const tilt =
    action.action.endsWith("_tilt") ||
    action.action === "cover.set_cover_tilt_position";
  const field = tilt ? "tilt_position" : "position";
  if (action.action.includes(".stop_")) {
    delete next[field];
  } else if (action.action.includes(".open_")) {
    next[field] = 100;
  } else if (action.action.includes(".close_")) {
    next[field] = 0;
  } else {
    const value: JsonValue | undefined = action.data?.[field];
    if (validCoverPosition(value)) {
      next[field] = value;
    } else {
      delete next[field];
    }
  }
  return next;
}
