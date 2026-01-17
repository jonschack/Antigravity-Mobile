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
        clearInterval(manager.timer);
    }
    jest.useRealTimers();
  });

  it('should start polling', () => {
    jest.spyOn(global, 'setInterval');
    manager.start();
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(manager.isRunning).toBe(true);
  });

  it('should not start if already running', () => {
    jest.spyOn(global, 'setInterval');
    manager.start();
    const timer = manager.timer;
    manager.start();
    expect(manager.timer).toBe(timer);
    expect(setInterval).toHaveBeenCalledTimes(1);
  });

  it('should stop polling', () => {
    jest.spyOn(global, 'clearInterval');
    manager.start();
    manager.stop();
    expect(clearInterval).toHaveBeenCalled();
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

    expect(onUpdate).toHaveBeenCalledWith({ html: '<div>1</div>' });

    // Second poll - no change
    mockSnapshotService.capture.mockResolvedValue({ html: '<div>1</div>' });
    onUpdate.mockClear();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    expect(onUpdate).not.toHaveBeenCalled();

    // Third poll - change
    mockSnapshotService.capture.mockResolvedValue({ html: '<div>2</div>' });
    jest.advanceTimersByTime(1000);
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

    expect(spy).toHaveBeenCalledWith('Poll error:', 'Ooops');
    expect(manager.isRunning).toBe(true);

    spy.mockRestore();
  });
});
