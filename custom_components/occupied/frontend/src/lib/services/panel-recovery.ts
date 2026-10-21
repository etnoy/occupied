import type { HomeAssistant, Program } from "../types.js";
import { actionTargets } from "../utils/custom-action.js";

export function entityAvailability(
  states: HomeAssistant["states"],
  programs: (Program | undefined)[],
): string {
  const entities = new Set<string>();
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
  private connection?: HomeAssistant["connection"];
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private pending = false;
  private running = false;
  private offline = false;
  private delay = 1000;
  private availability?: string;

  constructor(
    private readonly refresh: () => Promise<boolean>,
    private readonly reconnect: () => void,
    private readonly disconnect: () => void = () => {},
  ) {}

  connect(connection: HomeAssistant["connection"]) {
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

  observe(states: HomeAssistant["states"], programs: (Program | undefined)[]) {
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

  private readonly disconnected = () => {
    this.reset();
    this.offline = true;
    this.disconnect();
  };

  private readonly ready = () => {
    this.reset();
    this.reconnect();
    this.schedule(0);
  };

  private async run() {
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
