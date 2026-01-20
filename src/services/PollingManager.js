import { hashString } from '../utils/hashing.js';

export class PollingManager {
  /**
   * @param {import('./SnapshotService.js').SnapshotService} snapshotService
   * @param {number} intervalMs - Base polling interval
   * @param {Function} onUpdate - Callback function (snapshot) => void
   * @param {Function} [hashFn] - Optional hash function
   * @param {Object} [options] - Optional configuration for adaptive polling
   * @param {number} [options.minIntervalMs] - Minimum polling interval (default: intervalMs)
   * @param {number} [options.maxIntervalMs] - Maximum polling interval (default: intervalMs * 4)
   * @param {number} [options.idleThresholdMs] - Time of inactivity before slowing down (default: 30000)
   */
  constructor(snapshotService, intervalMs, onUpdate, hashFn = hashString, options = {}) {
    this.snapshotService = snapshotService;
    this.baseIntervalMs = intervalMs;
    this.intervalMs = intervalMs;
    this.onUpdate = onUpdate;
    this.hashFn = hashFn;
    this.lastSnapshotHash = null;
    this.timer = null;
    this.isRunning = false;
    this.isPolling = false;
    this.pendingReschedule = false;
    
    // Adaptive polling configuration
    this.minIntervalMs = options.minIntervalMs ?? intervalMs;
    this.maxIntervalMs = options.maxIntervalMs ?? intervalMs * 4;
    this.idleThresholdMs = options.idleThresholdMs ?? 30000;
    this.lastActivityTime = Date.now();
    this.lastChangeTime = Date.now();
  }

  /**
   * Starts the polling loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastActivityTime = Date.now();
    this.lastChangeTime = Date.now();
    this._scheduleNextPoll();
  }

  /**
   * Stops the polling loop.
   */
  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  /**
   * Signals user activity to speed up polling.
   */
  signalActivity() {
    this.lastActivityTime = Date.now();
    // If we slowed down, speed back up
    if (this.intervalMs > this.baseIntervalMs) {
      this.intervalMs = this.baseIntervalMs;
      this._reschedule();
    }
  }

  /**
   * Schedules the next poll based on adaptive interval.
   * @private
   */
  _scheduleNextPoll() {
    if (!this.isRunning) return;
    this.timer = setTimeout(() => this._pollAndReschedule(), this.intervalMs);
  }

  /**
   * Reschedules the next poll (used when activity is detected).
   * @private
   */
  _reschedule() {
    if (!this.isRunning) return;
    if (this.isPolling) {
      this.pendingReschedule = true;
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this._scheduleNextPoll();
  }

  /**
   * Polls and then schedules the next poll.
   * @private
   */
  async _pollAndReschedule() {
    this.isPolling = true;
    try {
      await this._poll();
    } finally {
      this.isPolling = false;
    }
    this._adjustInterval();
    if (this.pendingReschedule) {
      this.pendingReschedule = false;
    }
    this._scheduleNextPoll();
  }

  /**
   * Adjusts the polling interval based on activity and changes.
   * @private
   */
  _adjustInterval() {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivityTime;
    const timeSinceChange = now - this.lastChangeTime;

    // If idle for longer than threshold, gradually slow down
    if (timeSinceActivity > this.idleThresholdMs && timeSinceChange > this.idleThresholdMs) {
      // Increase interval by 50% up to max
      this.intervalMs = Math.min(this.intervalMs * 1.5, this.maxIntervalMs);
    } else {
      // Active: use base interval
      this.intervalMs = this.baseIntervalMs;
    }
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
          this.lastChangeTime = Date.now();
          this.onUpdate(snapshot);
        }
      }
    } catch (err) {
      // Log error but don't stop polling
      console.error('Poll error:', err.message);
    }
  }
}
