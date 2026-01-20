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
  });

  describe('start', () => {
    it('should initialize services and start server', async () => {
      mockCdpDiscoveryService.findEndpoint.mockResolvedValue({
        port: 9222,
        url: 'ws://localhost:9222',
      });

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
      mockCdpDiscoveryService.findEndpoint.mockResolvedValue({
        port: 9222,
        url: 'ws://localhost:9222',
      });

      await app.start();

      const createAppCall = mockCreateApp.mock.calls[0][0];
      expect(createAppCall).toHaveProperty('getSnapshot');
      expect(createAppCall).toHaveProperty('sendToCdp');
    });
  });

  describe('stop', () => {
    it('should stop services and close server', async () => {
      // First start to set up state
      mockCdpDiscoveryService.findEndpoint.mockResolvedValue({
        port: 9222,
        url: 'ws://localhost:9222',
      });
      await app.start();

      await app.stop();

      expect(mockPollingManager.stop).toHaveBeenCalled();
      expect(mockWss.close).toHaveBeenCalled();
      expect(mockHttpServer.close).toHaveBeenCalled();
      expect(mockCdpClient.close).toHaveBeenCalled();
    });
  });
});
