import { hashString } from '../utils/hashing.js';

export class PollingManager {
  /**
   * @param {import('./SnapshotService.js').SnapshotService} snapshotService
   * @param {number} intervalMs
   * @param {Function} onUpdate - Callback function (snapshot) => void
   * @param {Function} [hashFn] - Optional hash function
   */
  constructor(snapshotService, intervalMs, onUpdate, hashFn = hashString) {
    this.snapshotService = snapshotService;
    this.intervalMs = intervalMs;
    this.onUpdate = onUpdate;
    this.hashFn = hashFn;
    this.lastSnapshotHash = null;
    this.timer = null;
    this.isRunning = false;
  }

  /**
   * Starts the polling loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => this._poll(), this.intervalMs);
    // TODO feature-backend-tailscale-optimizations: Consider adapting poll interval based on network latency or user activity to save bandwidth on metered remote connections.
  }

  /**
   * Stops the polling loop.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  /**
   * Internal polling logic.
   * @private
   */
  async _poll() {
    try {
      const snapshot = await this.snapshotService.capture();
      if (snapshot && !snapshot.error) {
        const hash = this.hashFn(snapshot.html);

        // Only update if content changed
        if (hash !== this.lastSnapshotHash) {
          this.lastSnapshotHash = hash;
          this.onUpdate(snapshot);
        }
      }
    } catch (err) {
      // Log error but don't stop polling
      console.error('Poll error:', err.message);
    }
  }
}
