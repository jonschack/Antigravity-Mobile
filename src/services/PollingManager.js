import { hashString } from '../utils/hashing.js';

/**
 * Multiplier for slowing down polling when idle.
 * We use 1.5x (50% increase) as a balance between:
 * - Quickly reducing bandwidth on metered connections (higher = faster reduction)
 * - Avoiding jarring transitions for users (lower = smoother transitions)
 * The 1.5x value was chosen to reach max interval (4x) after ~6 idle cycles,
 * providing gradual degradation while still achieving meaningful savings.
 */
const IDLE_SLOWDOWN_MULTIPLIER = 1.5;

/**
 * Hysteresis threshold in milliseconds.
 * After resuming base polling due to activity, we keep fast polling for this
 * duration even if no new activity occurs. This prevents oscillation when
 * users have intermittent activity patterns (e.g., sending a message every 35s).
 */
const HYSTERESIS_MS = 10000;

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
   * Uses hysteresis to prevent rapid oscillation between fast and slow polling.
   * @private
   */
  _adjustInterval() {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivityTime;
    const timeSinceChange = now - this.lastChangeTime;

    // Apply hysteresis: after resuming fast polling, keep it fast for a grace period
    // This prevents oscillation when users have intermittent activity patterns
    const effectiveIdleThreshold = this.idleThresholdMs + HYSTERESIS_MS;

    // If idle for longer than threshold (with hysteresis), gradually slow down
    if (timeSinceActivity > effectiveIdleThreshold && timeSinceChange > effectiveIdleThreshold) {
      // Increase interval by IDLE_SLOWDOWN_MULTIPLIER up to max
      this.intervalMs = Math.min(this.intervalMs * IDLE_SLOWDOWN_MULTIPLIER, this.maxIntervalMs);
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
