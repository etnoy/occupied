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
  const resolver = document.createElement(
    "partial-panel-resolver",
  ) as HTMLElement & {
    _getRoutes(panels: { url_path: string; component_name: string }[]): {
      routes: Record<string, { load(): Promise<unknown> }>;
    };
  };
  await resolver
    ._getRoutes([{ url_path: "config", component_name: "config" }])
    .routes.config.load();
  await customElements.whenDefined("ha-panel-config");
  const config = document.createElement("ha-panel-config") as HTMLElement & {
    routerOptions: {
      routes: {
        automation: { load(): Promise<unknown> };
        integrations: { load(): Promise<unknown> };
      };
    };
  };
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

// Load HA's own chart implementation through its lazy history panel route.
// The timeline component accepts supplied data and does not fetch recorder history.
let historyChartLoad: Promise<void> | undefined;
export function loadHaHistoryChart() {
  if (customElements.get("state-history-chart-timeline")) {
    return Promise.resolve();
  }
  historyChartLoad ??= (async () => {
    await customElements.whenDefined("partial-panel-resolver");
    const resolver = document.createElement(
      "partial-panel-resolver",
    ) as HTMLElement & {
      _getRoutes(panels: { url_path: string; component_name: string }[]): {
        routes: Record<string, { load(): Promise<unknown> }>;
      };
    };
    await resolver
      ._getRoutes([{ url_path: "history", component_name: "history" }])
      .routes.history.load();
    if (!customElements.get("state-history-chart-timeline")) {
      throw new Error("Home Assistant history chart is unavailable");
    }
  })().catch((error: unknown) => {
    historyChartLoad = undefined;
    throw error;
  });
  return historyChartLoad;
}
