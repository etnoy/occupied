// Generated from custom_components/occupied/frontend/src/lib/panel-state.ts by pnpm run build. Do not edit.
export function hasProgram(panel) {
  return !!panel.draft && !!panel.saved && !!panel.document;
}
