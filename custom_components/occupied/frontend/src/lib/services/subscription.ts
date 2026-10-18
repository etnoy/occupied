import type { HomeAssistant } from "../types.js";

// Pending subscriptions and their callbacks must not outlive the selected panel.
export class PanelSubscription<T> {
  private epoch = 0;
  private pending = false;
  private unsubscribe: (() => Promise<void>) | null = null;

  constructor(
    private readonly isConnected: () => boolean,
    private readonly onError: (error: unknown) => void,
  ) {}

  get active(): boolean {
    return this.pending || this.unsubscribe !== null;
  }

  dispose() {
    this.epoch++;
    void this.unsubscribe?.().catch(() => {});
    this.unsubscribe = null;
    this.pending = false;
  }

  async subscribe(
    connection: HomeAssistant["connection"],
    message: Record<string, unknown>,
    onValue: (value: T) => void,
    onSubscribed?: () => Promise<void>,
  ): Promise<void> {
    if (this.active || !this.isConnected()) {
      return;
    }
    this.pending = true;
    const epoch = this.epoch;
    const isCurrent = () => epoch === this.epoch && this.isConnected();
    try {
      const unsubscribe = await connection.subscribeMessage<T>((value) => {
        if (isCurrent()) {
          onValue(value);
        }
      }, message);
      if (isCurrent()) {
        this.unsubscribe = unsubscribe;
        await onSubscribed?.();
      } else {
        void unsubscribe().catch(() => {});
      }
    } catch (error) {
      if (epoch === this.epoch) {
        this.onError(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this.pending = false;
      }
    }
  }
}
