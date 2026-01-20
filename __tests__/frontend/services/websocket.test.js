/**
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { WebSocketService } from '../../../public/js/services/websocket.js';

describe('WebSocketService', () => {
  let mockWebSocket;
  let onMessage, onOpen, onClose, onLatencyUpdate;

  beforeEach(() => {
    // Mock WebSocket class
    mockWebSocket = {
      close: jest.fn(),
      send: jest.fn(),
      readyState: 1, // WebSocket.OPEN
    };
    global.WebSocket = jest.fn(() => mockWebSocket);
    global.WebSocket.OPEN = 1;

    // Timer mocks
    jest.useFakeTimers();

    onMessage = jest.fn();
    onOpen = jest.fn();
    onClose = jest.fn();
    onLatencyUpdate = jest.fn();
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

    // First close - should reconnect after 1s (initial backoff)
    mockWebSocket.onclose();
    expect(onClose).toHaveBeenCalled();

    // Fast forward to initial reconnect interval (1000ms)
    jest.advanceTimersByTime(1000);
    expect(global.WebSocket).toHaveBeenCalledWith('ws://test');
  });

  test('should double reconnect interval with each failed attempt', () => {
    const service = new WebSocketService('ws://test', onMessage, onOpen, onClose);
    service.connect();

    // First close - reconnect interval should be 1s
    expect(service.currentReconnectInterval).toBe(1000);
    mockWebSocket.onclose();
    expect(service.currentReconnectInterval).toBe(2000);

    // Second close - reconnect interval should be 2s, then increase to 4s
    jest.advanceTimersByTime(1000);
    mockWebSocket.onclose();
    expect(service.currentReconnectInterval).toBe(4000);

    // Third close - reconnect interval should be 4s, then increase to 8s
    jest.advanceTimersByTime(2000);
    mockWebSocket.onclose();
    expect(service.currentReconnectInterval).toBe(8000);
  });

  test('should cap reconnect interval at maxReconnectInterval', () => {
    const service = new WebSocketService('ws://test', onMessage, onOpen, onClose);
    service.connect();

    // Simulate many disconnects to exceed max interval
    for (let i = 0; i < 10; i++) {
      mockWebSocket.onclose();
      jest.advanceTimersByTime(service.currentReconnectInterval / 2);
    }

    expect(service.currentReconnectInterval).toBe(30000);
  });

  test('should reset reconnect interval on successful connection', () => {
    const service = new WebSocketService('ws://test', onMessage, onOpen, onClose);
    service.connect();

    // Increase the interval by disconnecting a few times
    mockWebSocket.onclose();
    mockWebSocket.onclose();
    expect(service.currentReconnectInterval).toBeGreaterThan(1000);

    // Simulate successful reconnection
    mockWebSocket.onopen();
    expect(service.currentReconnectInterval).toBe(1000);
  });

  describe('latency measurement', () => {
    test('should start ping interval on connection', () => {
      const service = new WebSocketService('ws://test', onMessage, onOpen, onClose, onLatencyUpdate);
      service.connect();
      
      mockWebSocket.onopen();
      
      // Should have sent initial ping
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
    });

    test('should send periodic pings', () => {
      const service = new WebSocketService('ws://test', onMessage, onOpen, onClose, onLatencyUpdate);
      service.connect();
      
      mockWebSocket.onopen();
      mockWebSocket.send.mockClear();
      
      // Advance time to trigger next ping
      jest.advanceTimersByTime(5000);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
    });

    test('should calculate latency on pong response', () => {
      const service = new WebSocketService('ws://test', onMessage, onOpen, onClose, onLatencyUpdate);
      service.connect();
      
      mockWebSocket.onopen();
      
      // Set the pending ping time
      service.pendingPing = Date.now() - 50; // Simulate 50ms ago
      
      // Receive pong
      mockWebSocket.onmessage({ data: JSON.stringify({ type: 'pong' }) });
      
      expect(onLatencyUpdate).toHaveBeenCalled();
      expect(service.latency).toBeGreaterThanOrEqual(50);
    });

    test('should not call onMessage for pong responses', () => {
      const service = new WebSocketService('ws://test', onMessage, onOpen, onClose, onLatencyUpdate);
      service.connect();
      
      mockWebSocket.onopen();
      service.pendingPing = Date.now();
      
      // Receive pong
      mockWebSocket.onmessage({ data: JSON.stringify({ type: 'pong' }) });
      
      expect(onMessage).not.toHaveBeenCalled();
    });

    test('should stop ping on disconnect', () => {
      const service = new WebSocketService('ws://test', onMessage, onOpen, onClose, onLatencyUpdate);
      service.connect();
      
      mockWebSocket.onopen();
      expect(service.pingInterval).not.toBeNull();
      
      mockWebSocket.onclose();
      
      expect(service.pingInterval).toBeNull();
      expect(onLatencyUpdate).toHaveBeenCalledWith(null);
    });

    test('should return current latency via getLatency', () => {
      const service = new WebSocketService('ws://test', onMessage, onOpen, onClose, onLatencyUpdate);
      
      expect(service.getLatency()).toBeNull();
      
      service.latency = 100;
      expect(service.getLatency()).toBe(100);
    });
  });
});
