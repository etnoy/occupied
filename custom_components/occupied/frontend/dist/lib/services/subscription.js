// Generated from custom_components/occupied/frontend/src/lib/services/subscription.ts by pnpm run build. Do not edit.
// Pending subscriptions and their callbacks must not outlive the selected panel.
export class PanelSubscription {
  isConnected;
  onError;
  epoch = 0;
  pending = false;
  unsubscribe = null;
  constructor(isConnected, onError) {
    this.isConnected = isConnected;
    this.onError = onError;
  }
  get active() {
    return this.pending || this.unsubscribe !== null;
  }
  dispose() {
    this.epoch++;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.pending = false;
  }
  async subscribe(connection, message, onValue, onSubscribed) {
    if (this.active || !this.isConnected()) {
      return;
    }
    this.pending = true;
    const epoch = this.epoch;
    const isCurrent = () => epoch === this.epoch && this.isConnected();
    try {
      const unsubscribe = await connection.subscribeMessage((value) => {
        if (isCurrent()) {
          onValue(value);
        }
      }, message);
      if (isCurrent()) {
        this.unsubscribe = unsubscribe;
        await onSubscribed?.();
      } else {
        unsubscribe();
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
