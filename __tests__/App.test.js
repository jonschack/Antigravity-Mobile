import { jest } from '@jest/globals';

// Define mocks
const mockCdpDiscoveryService = {
  findEndpoint: jest.fn(),
};
const mockCdpClient = {
  connect: jest.fn(),
  contexts: [],
  isConnected: true,
  close: jest.fn(),
};
const mockSnapshotService = {};
const mockMessageInjectionService = {
  inject: jest.fn(),
};
const mockPollingManager = {
  start: jest.fn(),
  stop: jest.fn(),
};
const mockExpressApp = {};
const mockHttpServer = {
  listen: jest.fn((port, host, cb) => cb && cb()),
  close: jest.fn((cb) => cb && cb()),
};
const mockWss = {
  clients: [],
  close: jest.fn((cb) => cb && cb()),
};
const mockCreateApp = jest.fn(() => mockExpressApp);
const mockCreateWebSocketServer = jest.fn(() => mockWss);

// Mock modules
jest.unstable_mockModule('../src/services/CdpDiscoveryService.js', () => ({
  CdpDiscoveryService: jest.fn(() => mockCdpDiscoveryService),
}));
jest.unstable_mockModule('../src/services/CdpClient.js', () => ({
  CdpClient: jest.fn(() => mockCdpClient),
}));
jest.unstable_mockModule('../src/services/SnapshotService.js', () => ({
  SnapshotService: jest.fn(() => mockSnapshotService),
}));
jest.unstable_mockModule('../src/services/MessageInjectionService.js', () => ({
  MessageInjectionService: jest.fn(() => mockMessageInjectionService),
}));
jest.unstable_mockModule('../src/services/PollingManager.js', () => ({
  PollingManager: jest.fn(() => mockPollingManager),
}));
jest.unstable_mockModule('../src/app.js', () => ({
  createApp: mockCreateApp,
}));
jest.unstable_mockModule('../src/websocket.js', () => ({
  createWebSocketServer: mockCreateWebSocketServer,
}));
jest.unstable_mockModule('http', () => ({
  default: {
    createServer: jest.fn(() => mockHttpServer),
  },
}));

// Import App after mocking
const { App } = await import('../src/App.js');

describe('App', () => {
  let app;
  const config = {
    ports: [9222],
    pollInterval: 1000,
    port: 3000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    app = new App(config);
    
    // Restore default mock implementations
    mockCdpClient.connect.mockResolvedValue(undefined);
    mockHttpServer.listen.mockImplementation((port, host, cb) => cb && cb());
    mockCdpDiscoveryService.findEndpoint.mockResolvedValue({
      port: 9222,
      url: 'ws://localhost:9222',
    });
  });

  describe('start', () => {
    it('should initialize services and start server', async () => {
      await app.start();

      expect(mockCdpDiscoveryService.findEndpoint).toHaveBeenCalled();
      expect(mockCdpClient.connect).toHaveBeenCalledWith(
        'ws://localhost:9222',
      );
      expect(mockCreateApp).toHaveBeenCalled();
      expect(mockCreateWebSocketServer).toHaveBeenCalledWith(mockHttpServer);
      expect(mockPollingManager.start).toHaveBeenCalled();
      expect(mockHttpServer.listen).toHaveBeenCalledWith(
        3000,
        '0.0.0.0',
        expect.any(Function),
      );
    });

    it('should pass correct callbacks to createApp', async () => {
      await app.start();

      const createAppCall = mockCreateApp.mock.calls[0][0];
      expect(createAppCall).toHaveProperty('getSnapshot');
      expect(createAppCall).toHaveProperty('sendToCdp');
    });

    it('should verify polling callback updates lastSnapshot and broadcasts', async () => {
      const WEBSOCKET_OPEN = 1;
      const WEBSOCKET_CONNECTING = 0;
      const mockClient1 = { readyState: WEBSOCKET_OPEN, send: jest.fn() };
      const mockClient2 = { readyState: WEBSOCKET_CONNECTING, send: jest.fn() };
      mockWss.clients = [mockClient1, mockClient2];

      await app.start();

      // Get the polling callback that was passed to PollingManager
      // PollingManager is called with (snapshotService, pollInterval, callback)
      const PollingManagerMock = (await import('../src/services/PollingManager.js')).PollingManager;
      const pollingCallback = PollingManagerMock.mock.calls[0][2];

      // Simulate a snapshot update
      const testSnapshot = { data: 'test-snapshot' };
      pollingCallback(testSnapshot);

      // Verify lastSnapshot was updated
      expect(app.lastSnapshot).toEqual(testSnapshot);

      // Verify only open WebSocket clients received the broadcast
      expect(mockClient1.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(mockClient1.send.mock.calls[0][0]);
      expect(sentMessage).toMatchObject({
        type: 'snapshot_update',
      });
      expect(sentMessage.timestamp).toBeDefined();
      expect(typeof sentMessage.timestamp).toBe('string');
      expect(mockClient2.send).not.toHaveBeenCalled();
    });

    it('should verify getSnapshot callback returns lastSnapshot', async () => {
      await app.start();

      // Set lastSnapshot
      const testSnapshot = { data: 'test-data' };
      app.lastSnapshot = testSnapshot;

      // Get the getSnapshot callback
      const createAppCall = mockCreateApp.mock.calls[0][0];
      const getSnapshot = createAppCall.getSnapshot;

      // Verify it returns the correct snapshot
      expect(getSnapshot()).toEqual(testSnapshot);
    });

    it('should verify sendToCdp callback calls injection service', async () => {
      mockMessageInjectionService.inject.mockResolvedValue({ success: true });

      await app.start();

      // Get the sendToCdp callback
      const createAppCall = mockCreateApp.mock.calls[0][0];
      const sendToCdp = createAppCall.sendToCdp;

      // Call sendToCdp with a test message
      const testMessage = 'test-message';
      const result = await sendToCdp(testMessage);

      // Verify it called the injection service
      expect(mockMessageInjectionService.inject).toHaveBeenCalledWith(testMessage);
      expect(result).toEqual({ success: true });
    });

    it('should throw error in sendToCdp if CDP not connected', async () => {
      await app.start();

      // Simulate CDP disconnection
      app.cdpClient.isConnected = false;

      // Get the sendToCdp callback
      const createAppCall = mockCreateApp.mock.calls[0][0];
      const sendToCdp = createAppCall.sendToCdp;

      // Verify it throws an error
      await expect(sendToCdp('test')).rejects.toThrow('CDP not connected');
    });

    it('should handle CDP discovery failure', async () => {
      mockCdpDiscoveryService.findEndpoint.mockRejectedValue(
        new Error('No CDP endpoint found')
      );

      await expect(app.start()).rejects.toThrow('No CDP endpoint found');
    });

    it('should handle CDP connection failure', async () => {
      mockCdpClient.connect.mockRejectedValue(
        new Error('Connection failed')
      );

      await expect(app.start()).rejects.toThrow('Connection failed');
    });

    it('should handle server listen failure', async () => {
      mockHttpServer.listen.mockImplementation(() => {
        // Simulate listen error by throwing instead of calling callback
        throw new Error('Port already in use');
      });

      await expect(app.start()).rejects.toThrow('Port already in use');
    });
  });

  describe('stop', () => {
    it('should stop services and close server', async () => {
      // First start to set up state
      await app.start();

      await app.stop();

      expect(mockPollingManager.stop).toHaveBeenCalled();
      expect(mockWss.close).toHaveBeenCalled();
      expect(mockHttpServer.close).toHaveBeenCalled();
      expect(mockCdpClient.close).toHaveBeenCalled();
    });
  });
});
