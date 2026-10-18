import type { OccupiedPanel } from "../occupied-panel.js";
import type { Program, ProgramDocument } from "./types.js";

export type LoadedOccupiedPanel = OccupiedPanel & {
  draft: Program;
  saved: Program;
  document: ProgramDocument;
};

export function hasProgram(panel: OccupiedPanel): panel is LoadedOccupiedPanel {
  return !!panel.draft && !!panel.saved && !!panel.document;
}
