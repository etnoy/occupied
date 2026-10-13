// Generated from ha-controls.ts by pnpm run build. Do not edit.
// HA loads configuration controls lazily. Use its configuration route loader,
// as other custom panels do, before assigning properties to native controls.
export async function loadHaControls() {
  if (
    customElements.get("ha-selector") &&
    customElements.get("ha-generic-picker") &&
    customElements.get("ha-top-app-bar-fixed")
  ) {
    return;
  }
  await customElements.whenDefined("partial-panel-resolver");
  const resolver = document.createElement("partial-panel-resolver");
  await resolver
    ._getRoutes([{ url_path: "config", component_name: "config" }])
    .routes.config.load();
  await customElements.whenDefined("ha-panel-config");
  const config = document.createElement("ha-panel-config");
  await Promise.all([
    config.routerOptions.routes.automation.load(),
    config.routerOptions.routes.integrations.load(),
  ]);
  await Promise.all([
    customElements.whenDefined("ha-selector"),
    customElements.whenDefined("ha-generic-picker"),
    customElements.whenDefined("ha-top-app-bar-fixed"),
  ]);
}
