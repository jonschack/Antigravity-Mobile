import { jest } from '@jest/globals';
import { PollingManager } from '../../src/services/PollingManager.js';

describe('PollingManager', () => {
  let mockSnapshotService;
  let onUpdate;
  let manager;

  beforeEach(() => {
    jest.useFakeTimers();
    mockSnapshotService = {
      capture: jest.fn()
    };
    onUpdate = jest.fn();
    manager = new PollingManager(mockSnapshotService, 1000, onUpdate);
  });

  afterEach(() => {
    // Stop the manager first
    if (manager.timer) {
      clearTimeout(manager.timer);
    }
    jest.useRealTimers();
  });

  it('should start polling', () => {
    jest.spyOn(global, 'setTimeout');
    manager.start();
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(manager.isRunning).toBe(true);
  });

  it('should not start if already running', () => {
    jest.spyOn(global, 'setTimeout');
    manager.start();
    const timer = manager.timer;
    manager.start();
    expect(manager.timer).toBe(timer);
  });

  it('should stop polling', () => {
    jest.spyOn(global, 'clearTimeout');
    manager.start();
    manager.stop();
    expect(clearTimeout).toHaveBeenCalled();
    expect(manager.isRunning).toBe(false);
  });

  it('should call onUpdate when snapshot changes', async () => {
    manager.start();

    // First poll
    mockSnapshotService.capture.mockResolvedValue({ html: '<div>1</div>' });
    jest.advanceTimersByTime(1000);

    // Wait for async poll to finish
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onUpdate).toHaveBeenCalledWith({ html: '<div>1</div>' });

    // Second poll - no change
    mockSnapshotService.capture.mockResolvedValue({ html: '<div>1</div>' });
    onUpdate.mockClear();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onUpdate).not.toHaveBeenCalled();

    // Third poll - change
    mockSnapshotService.capture.mockResolvedValue({ html: '<div>2</div>' });
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onUpdate).toHaveBeenCalledWith({ html: '<div>2</div>' });
  });

  it('should handle errors gracefully', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    manager.start();

    mockSnapshotService.capture.mockRejectedValue(new Error('Ooops'));
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(spy).toHaveBeenCalledWith('Poll error:', 'Ooops');
    expect(manager.isRunning).toBe(true);

    spy.mockRestore();
  });

  describe('adaptive polling', () => {
    it('should slow down polling after idle threshold', async () => {
      const options = {
        minIntervalMs: 1000,
        maxIntervalMs: 4000,
        idleThresholdMs: 5000
      };
      manager = new PollingManager(mockSnapshotService, 1000, onUpdate, undefined, options);
      manager.start();

      // Complete a few polls without changes
      mockSnapshotService.capture.mockResolvedValue({ html: '<div>1</div>' });
      
      // First poll - content changes, sets lastChangeTime
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Advance past idle threshold + hysteresis (5000 + 10000 = 15000ms)
      jest.advanceTimersByTime(16000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // After being idle past hysteresis period, interval should increase
      expect(manager.intervalMs).toBeGreaterThan(1000);
    });

    it('should speed up polling when activity is signaled', async () => {
      const options = {
        minIntervalMs: 1000,
        maxIntervalMs: 4000,
        idleThresholdMs: 5000
      };
      manager = new PollingManager(mockSnapshotService, 1000, onUpdate, undefined, options);
      
      // Manually slow down the manager
      manager.intervalMs = 4000;
      manager.start();

      // Signal activity
      manager.signalActivity();

      // Should be back to base interval
      expect(manager.intervalMs).toBe(1000);
    });

    it('should not exceed max interval', async () => {
      const options = {
        minIntervalMs: 1000,
        maxIntervalMs: 2000,
        idleThresholdMs: 100
      };
      manager = new PollingManager(mockSnapshotService, 1000, onUpdate, undefined, options);
      mockSnapshotService.capture.mockResolvedValue({ html: '<div>1</div>' });
      manager.start();

      // Run many polls to ensure interval doesn't exceed max
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(manager.intervalMs);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      }

      expect(manager.intervalMs).toBeLessThanOrEqual(2000);
    });
  });
});
