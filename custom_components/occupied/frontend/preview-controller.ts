import type { OccupiedPanel } from "./occupied-panel.js";
import type { HomeAssistant, LivePreviewResponse } from "./types.js";
import { copy } from "./model.js";
import { shiftScheduleDate } from "./time-format.js";
import { mergeLiveSession } from "./live-preview.js";

// Preview requests update the shared panel state. The panel owns element lifecycle.
export class PreviewController {
  private recoveryEpoch = 0;
  private connection?: HomeAssistant["connection"];

  constructor(
    private readonly panel: OccupiedPanel,
    private readonly getEntryId: () => string | null,
  ) {}

  invalidate() {
    this.panel.liveReady = false;
    this.recoveryEpoch++;
  }

  connect(connection: HomeAssistant["connection"]) {
    this.connection = connection;
    connection.addEventListener?.("ready", this.connected);
    connection.addEventListener?.("disconnected", this.disconnected);
  }

  disconnect() {
    this.connection?.removeEventListener?.("ready", this.connected);
    this.connection?.removeEventListener?.("disconnected", this.disconnected);
    this.connection = undefined;
    this.invalidate();
  }

  movePreviewDay(days: number) {
    return this.selectPreviewDate(
      shiftScheduleDate(
        this.panel.previewDate || this.panel.document.simulation_date,
        days,
      ),
    );
  }

  selectPreviewDate(date: string) {
    if (
      this.panel.busy ||
      this.panel.liveBusy ||
      this.panel.liveRunning ||
      this.panel.tab !== "preview" ||
      date === this.panel.previewDate
    ) {
      return;
    }
    this.panel.previewDate = date;
    this.panel.liveVisible = false;

    return this.loadPreview();
  }

  loadPreview() {
    if (
      this.panel.busy ||
      !this.panel.draft ||
      !this.panel.document ||
      this.panel.liveRunning ||
      (this.panel.liveVisible && this.panel.livePlan)
    ) {
      return;
    }
    const version = this.panel.version,
      draft = copy(this.panel.draft),
      date = this.panel.previewDate || this.panel.document.simulation_date;
    this.panel.previewDate = date;

    return this.panel.run(async (epoch) => {
      const result = await this.panel.ws("preview", {
        program: draft,
        date,
        days: 1,
        seed: "preview-1",
      });
      if (
        epoch !== this.panel.epoch ||
        version !== this.panel.version ||
        date !== this.panel.previewDate
      ) {
        return;
      }
      this.panel.preview = result;
      this.panel.previewProgram = draft;
      this.panel.showIssues(result);
    });
  }

  readonly disconnected = () => {
    this.invalidate();
    this.panel.flush();
  };
  readonly connected = () => void this.recoverLivePreview();
  readonly visibilityChanged = () => {
    if (document.visibilityState === "visible") {
      void this.recoverLivePreview();
    } else {
      this.disconnected();
    }
  };

  private adoptLive(result: LivePreviewResponse) {
    this.panel.liveSession = mergeLiveSession(
      this.panel.liveSession,
      result.session,
    );
    if (this.panel.liveSession && result.call_outcomes) {
      this.panel.liveSession.outcomes = {
        ...this.panel.liveSession.outcomes,
        ...result.call_outcomes,
      };
    }
    this.panel.liveCanAdvance = result.can_advance;
    this.panel.schedulingPaused =
      this.panel.liveSession?.paused ?? this.panel.schedulingPaused;
    if (result.plan && result.program) {
      this.panel.livePlan = result.plan;
      this.panel.liveProgram = result.program;
      this.panel.liveVisible =
        !!result.session && (this.panel.liveRunning || result.session.paused);
      if (this.panel.liveVisible) {
        this.panel.previewDate = result.session!.date;
      }
    }
    this.panel.flush();
  }

  async recoverLivePreview() {
    if (!this.getEntryId() || !this.panel.isConnected) {
      return;
    }
    const epoch = this.panel.epoch,
      recovery = ++this.recoveryEpoch;
    this.panel.liveReady = false;
    this.panel.flush();
    try {
      const result = await this.panel.ws("live_preview/status");
      if (epoch !== this.panel.epoch || recovery !== this.recoveryEpoch) {
        return;
      }
      this.adoptLive(result);
      this.panel.liveReady = true;
    } catch (error) {
      if (epoch === this.panel.epoch && recovery === this.recoveryEpoch) {
        this.panel.fail(error);
      }
    } finally {
      if (epoch === this.panel.epoch && recovery === this.recoveryEpoch) {
        this.panel.flush();
      }
    }
  }

  async startLivePreview() {
    if (
      this.panel.liveBusy ||
      this.panel.liveRunning ||
      !this.panel.liveReady ||
      this.panel.busy
    ) {
      return;
    }
    const frozen = this.panel.liveVisible && this.panel.liveSession;
    const program = frozen ? this.panel.liveProgram : this.panel.previewProgram;
    const fingerprint = frozen
      ? this.panel.liveSession?.plan_fingerprint
      : this.panel.preview?.plan_fingerprint;
    if (!program || !fingerprint) {
      return;
    }
    const epoch = this.panel.epoch;
    this.panel.liveBusy = true;
    this.panel.error = "";
    this.panel.flush();
    try {
      const result = await this.panel.ws("live_preview/start", {
        program: copy(program),
        date: this.panel.previewDate,
        seed: "preview-1",
        expected_plan_fingerprint: fingerprint,
        request_id: crypto.randomUUID(),
      });
      if (epoch === this.panel.epoch) {
        this.adoptLive(result);
      }
    } catch (error) {
      if (epoch === this.panel.epoch) {
        this.panel.fail(error);
        await this.recoverLivePreview();
      }
    } finally {
      if (epoch === this.panel.epoch) {
        this.panel.liveBusy = false;
        this.panel.flush();
      }
    }
  }

  async nextLiveEvent() {
    const session = this.panel.liveSession;
    if (
      !session?.next_group ||
      session.state !== "ready" ||
      !this.panel.liveReady ||
      !this.panel.liveCanAdvance ||
      this.panel.liveBusy ||
      this.panel.liveStopping
    ) {
      return;
    }
    const epoch = this.panel.epoch;
    this.panel.liveBusy = true;
    this.panel.error = "";
    this.panel.flush();
    try {
      const result = await this.panel.ws("live_preview/next", {
        session_id: session.id,
        expected_group_id: session.next_group.id,
        request_id: crypto.randomUUID(),
      });
      if (
        epoch === this.panel.epoch &&
        this.panel.liveSession?.id === session.id
      ) {
        this.adoptLive(result);
      }
    } catch (error) {
      if (epoch === this.panel.epoch) {
        this.panel.fail(error);
        await this.recoverLivePreview();
      }
    } finally {
      if (epoch === this.panel.epoch) {
        this.panel.liveBusy = false;
        this.panel.flush();
      }
    }
  }

  async stopLivePreview() {
    const session = this.panel.liveSession;
    if (!session || !this.panel.liveRunning || this.panel.liveStopping) {
      return;
    }
    const epoch = this.panel.epoch;
    this.panel.liveStopping = true;
    this.panel.flush();
    try {
      const result = await this.panel.ws("live_preview/stop", {
        session_id: session.id,
      });
      if (
        epoch === this.panel.epoch &&
        this.panel.liveSession?.id === session.id
      ) {
        this.adoptLive(result);
      }
    } catch (error) {
      if (epoch === this.panel.epoch) {
        this.panel.fail(error);
        await this.recoverLivePreview();
      }
    } finally {
      if (epoch === this.panel.epoch) {
        this.panel.liveStopping = false;
        this.panel.flush();
      }
    }
  }

  resumeScheduling() {
    return this.panel.run(async (epoch) => {
      await this.panel._hass.callWS({
        type: "call_service",
        domain: "occupied",
        service: "resume",
        service_data: { config_entry_id: this.getEntryId() },
      });
      if (epoch === this.panel.epoch) {
        await this.recoverLivePreview();
      }
    });
  }

  refreshPreviewSchedule() {
    if (this.panel.liveRunning || this.panel.liveBusy) {
      return;
    }
    this.panel.liveVisible = false;

    return this.loadPreview();
  }
}
