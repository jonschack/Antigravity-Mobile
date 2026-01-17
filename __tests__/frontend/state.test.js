/**
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { StateManager } from '../../public/js/state.js';

describe('StateManager', () => {
  let stateManager;
  let mockCallback;

  beforeEach(() => {
    // Mock timers for testing timeouts
    jest.useFakeTimers();
    stateManager = new StateManager();
    mockCallback = jest.fn();
    stateManager.subscribe(mockCallback);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should initialize with default values', () => {
    expect(stateManager.state.autoRefreshEnabled).toBe(true);
    expect(stateManager.state.userIsScrolling).toBe(false);
  });

  test('should update autoRefreshEnabled', () => {
    stateManager.setAutoRefresh(false);
    expect(stateManager.state.autoRefreshEnabled).toBe(false);
    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({ autoRefreshEnabled: false }));
  });

  test('should handle user scrolling', () => {
    stateManager.handleUserScroll();
    expect(stateManager.state.userIsScrolling).toBe(true);
    expect(mockCallback).toHaveBeenCalled();

    // Fast forward time to trigger scroll timeout (0.5s)
    jest.advanceTimersByTime(500);
    expect(stateManager.state.userIsScrolling).toBe(false);
  });

  test('should reset auto refresh after idle time', () => {
    stateManager.setAutoRefresh(false); // Manually disabled

    // Simulate scroll
    stateManager.handleUserScroll();

    // Verify it's not reset yet
    jest.advanceTimersByTime(5000);
    expect(stateManager.state.autoRefreshEnabled).toBe(false);

    // Original logic:
    // 1. scroll -> userIsScrolling = true
    // 2. 500ms later -> userIsScrolling = false
    // 3. 10000ms later (from scroll event) -> autoRefreshEnabled = true

    jest.advanceTimersByTime(5500); // Total > 10s
    expect(stateManager.state.autoRefreshEnabled).toBe(true);
    expect(mockCallback).toHaveBeenCalled();
  });
});
