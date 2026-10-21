// Generated from custom_components/occupied/frontend/src/lib/services/panel-recovery.ts by pnpm run build. Do not edit.
import { actionTargets } from "../utils/custom-action.js";
export function entityAvailability(states, programs) {
  const entities = new Set();
  for (const program of programs) {
    for (const step of Object.values(program?.steps || {})) {
      for (const entity of actionTargets(step)) {
        entities.add(entity);
      }
    }
    for (const event of Object.values(program?.random || {})) {
      for (const entity of [
        ...actionTargets(event.on),
        ...actionTargets(event.off),
      ]) {
        entities.add(entity);
      }
    }
  }
  return JSON.stringify(
    [...entities].sort().map((entity) => {
      const state = states?.[entity]?.state;
      const availability = state == null ? "missing" : "available";
      return [
        entity,
        state === "unknown" || state === "unavailable" ? state : availability,
      ];
    }),
  );
}
// One background refresh at a time, with a trailing refresh for changes in flight.
export class PanelRecovery {
  refresh;
  reconnect;
  disconnect;
  connection;
  timer;
  generation = 0;
  pending = false;
  running = false;
  offline = false;
  delay = 1000;
  availability;
  constructor(refresh, reconnect, disconnect = () => {}) {
    this.refresh = refresh;
    this.reconnect = reconnect;
    this.disconnect = disconnect;
  }
  connect(connection) {
    if (this.connection === connection) {
      return;
    }
    this.dispose();
    this.connection = connection;
    connection.addEventListener?.("ready", this.ready);
    connection.addEventListener?.("disconnected", this.disconnected);
  }
  dispose() {
    this.connection?.removeEventListener?.("ready", this.ready);
    this.connection?.removeEventListener?.("disconnected", this.disconnected);
    this.connection = undefined;
    this.reset();
  }
  reset() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = this.running = this.offline = false;
    this.delay = 1000;
    this.availability = undefined;
  }
  observe(states, programs) {
    if (!states) {
      return;
    }
    const availability = entityAvailability(states, programs);
    if (this.availability !== undefined && availability !== this.availability) {
      this.schedule();
    }
    this.availability = availability;
  }
  schedule(delay = 250) {
    if (!this.connection) {
      return;
    }
    this.pending = true;
    if (this.offline || this.running || this.timer !== undefined) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.run();
    }, delay);
  }
  disconnected = () => {
    this.reset();
    this.offline = true;
    this.disconnect();
  };
  ready = () => {
    this.reset();
    this.reconnect();
    this.schedule(0);
  };
  async run() {
    const generation = this.generation;
    this.pending = false;
    this.running = true;
    let success = false;
    try {
      success = await this.refresh();
    } catch {
      // A failed refresh must remain retryable without an unhandled rejection.
    } finally {
      if (generation === this.generation) {
        this.running = false;
        if (success) {
          this.delay = 1000;
          if (this.pending) {
            this.schedule();
          }
        } else {
          this.schedule(this.delay);
          this.delay = Math.min(this.delay * 2, 30_000);
        }
      }
    }
  }
}
