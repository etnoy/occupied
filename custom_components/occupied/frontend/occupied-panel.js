// Dependency-free bundled checkpoint panel. HA owns every device timer.
class OccupiedPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._busy = false;
    this._status = null;
    this._error = "";
  }

  set hass(value) {
    this._hass = value;
    this._refresh();
  }

  set panel(value) {
    this._panel = value;
    this._refresh();
  }

  connectedCallback() {
    this._render();
    this._refresh();
  }

  async _refresh() {
    const entry = this._panel?.config?.config_entry_id;
    if (!this.isConnected || !this._hass || !entry || this._busy) return;
    this._busy = true;
    try {
      this._status = await this._hass.callWS({ type: "occupied/status", config_entry_id: entry });
      this._error = "";
    } catch (error) {
      this._error = error.message || "Unable to load Occupied status";
    } finally {
      this._busy = false;
      if (this.isConnected) this._render();
    }
  }

  async _control(service) {
    try {
      await this._hass.callService("occupied", service, {
        config_entry_id: this._panel.config.config_entry_id,
      });
      await this._refresh();
    } catch (error) {
      this._error = error.message || "Unable to change simulation state";
      this._render();
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; color: var(--primary-text-color); background: var(--primary-background-color); min-height: 100%; }
        main { max-width: 760px; padding: 24px; margin: auto; font: 16px/1.5 system-ui, sans-serif; }
        h1 { margin-bottom: 4px; } p { margin-top: 4px; }
        section { background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 12px; padding: 20px; margin: 20px 0; }
        dl { display: grid; grid-template-columns: minmax(120px, 1fr) 2fr; gap: 12px; }
        dd { margin: 0; overflow-wrap: anywhere; } dt { color: var(--secondary-text-color); }
        nav { display: flex; gap: 12px; flex-wrap: wrap; }
        button, a { font: inherit; } button { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); cursor: pointer; }
        button:focus-visible, a:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 3px; }
        a { color: var(--primary-color); } .error { color: var(--error-color, #b3261e); }
        ol { padding-left: 24px; } li { margin: 8px 0; }
        @media (max-width: 480px) { main { padding: 16px; } dl { grid-template-columns: 1fr; gap: 4px; } dd { margin-bottom: 12px; } }
      </style>
      <main>
        <h1>Occupied</h1>
        <p id="house"></p>
        <p class="error" id="error" role="alert"></p>
        <section aria-label="Simulation status" aria-live="polite"><dl id="status"></dl></section>
        <nav aria-label="Simulation controls" id="controls"></nav>
        <section><h2>Upcoming actions</h2><ol id="events"></ol></section>
        <p><a href="/config/integrations/integration/occupied">Configure Occupied</a></p>
        <p>This development checkpoint runs one light sequence and an optional timed remote activity each time activation begins. Routine editing is planned for a later stage.</p>
      </main>`;
    const root = this.shadowRoot;
    root.getElementById("error").textContent = this._error;
    const state = this._status;
    root.getElementById("house").textContent = state?.name || "Loading household…";
    if (!state) return;
    const time = (value) => value ? new Date(value).toLocaleString() : "None";
    const fields = [
      ["Status", state.status], ["Reason", state.reason],
      ["Permission", state.enabled ? "Enabled" : "Disabled"],
      ["Next action", time(state.next_event)],
      ["Lighting handover ends", time(state.handover_deadline)],
      ["Remote activity ends", time(state.remote_deadline)],
    ];
    for (const [label, value] of fields) {
      const dt = document.createElement("dt"); dt.textContent = label;
      const dd = document.createElement("dd"); dd.textContent = value;
      root.getElementById("status").append(dt, dd);
    }
    for (const [label, service] of [[state.enabled ? "Disable" : "Enable", state.enabled ? "stop" : "start"], [state.paused ? "Resume" : "Pause", state.paused ? "resume" : "pause"]]) {
      const button = document.createElement("button");
      button.textContent = label;
      button.addEventListener("click", () => this._control(service));
      root.getElementById("controls").append(button);
    }
    for (const event of state.events) {
      const li = document.createElement("li");
      li.textContent = `${time(event.time)} · ${event.event.replaceAll("_", " ")}`;
      root.getElementById("events").append(li);
    }
    if (!state.events.length) {
      const li = document.createElement("li"); li.textContent = "No pending actions";
      root.getElementById("events").append(li);
    }
  }
}
if (!customElements.get("occupied-panel")) customElements.define("occupied-panel", OccupiedPanel);
