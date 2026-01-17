/**
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { WebSocketService } from '../../../public/js/services/websocket.js';

describe('WebSocketService', () => {
  let mockWebSocket;
  let onMessage, onOpen, onClose;

  beforeEach(() => {
    // Mock WebSocket class
    mockWebSocket = {
      close: jest.fn(),
      send: jest.fn(),
    };
    global.WebSocket = jest.fn(() => mockWebSocket);

    // Timer mocks
    jest.useFakeTimers();

    onMessage = jest.fn();
    onOpen = jest.fn();
    onClose = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should connect and setup event listeners', () => {
    const service = new WebSocketService('ws://test', onMessage, onOpen, onClose);
    service.connect();

    expect(global.WebSocket).toHaveBeenCalledWith('ws://test');
    expect(mockWebSocket.onopen).toBeDefined();
    expect(mockWebSocket.onmessage).toBeDefined();
    expect(mockWebSocket.onclose).toBeDefined();
  });

  test('should handle onopen', () => {
    const service = new WebSocketService('ws://test', onMessage, onOpen, onClose);
    service.connect();

    // Simulate open
    mockWebSocket.onopen();
    expect(onOpen).toHaveBeenCalled();
  });

  test('should handle onmessage', () => {
    const service = new WebSocketService('ws://test', onMessage, onOpen, onClose);
    service.connect();

    // Simulate message
    const data = { type: 'test' };
    mockWebSocket.onmessage({ data: JSON.stringify(data) });
    expect(onMessage).toHaveBeenCalledWith(data);
  });

  test('should handle onclose and reconnect with exponential backoff', () => {
    const service = new WebSocketService('ws://test', onMessage, onOpen, onClose);
    service.connect();

    // Clear initial call to verify reconnect calls it again
    global.WebSocket.mockClear();

    // Simulate close
    mockWebSocket.onclose();
    expect(onClose).toHaveBeenCalled();

    // Fast forward to first reconnect attempt (2000ms base + up to 1000ms jitter = max 3000ms)
    jest.advanceTimersByTime(3000);
    expect(global.WebSocket).toHaveBeenCalledWith('ws://test');
    
    // Verify exponential backoff increases with attempts
    expect(service.reconnectAttempts).toBe(1);
  });
});
