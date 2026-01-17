import { jest } from '@jest/globals';

const mockListen = jest.fn((port, host, cb) => cb && cb());
const mockServer = {
  listen: mockListen,
};
const mockExpressApp = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
};
const mockExpress = jest.fn(() => mockExpressApp);
mockExpress.static = jest.fn();
mockExpress.json = jest.fn();

const mockWebSocketServer = jest.fn();
mockWebSocketServer.prototype.on = jest.fn();

const mockFindEndpoint = jest.fn();
const mockConnect = jest.fn();
const mockStartPolling = jest.fn();
const mockInject = jest.fn();

jest.unstable_mockModule('express', () => ({
  default: mockExpress,
}));

jest.unstable_mockModule('http', () => ({
  default: {
    createServer: jest.fn(() => mockServer),
  },
}));

jest.unstable_mockModule('ws', () => ({
  WebSocketServer: mockWebSocketServer,
  default: {
      OPEN: 1
  }
}));

jest.unstable_mockModule('../src/services/CdpDiscoveryService.js', () => ({
  CdpDiscoveryService: jest.fn(() => ({
    findEndpoint: mockFindEndpoint,
  })),
}));

jest.unstable_mockModule('../src/services/CdpClient.js', () => ({
  CdpClient: jest.fn(() => ({
    connect: mockConnect,
    contexts: [],
    isConnected: true,
  })),
}));

jest.unstable_mockModule('../src/services/SnapshotService.js', () => ({
  SnapshotService: jest.fn(),
}));

jest.unstable_mockModule('../src/services/MessageInjectionService.js', () => ({
  MessageInjectionService: jest.fn(() => ({
    inject: mockInject,
  })),
}));

jest.unstable_mockModule('../src/services/PollingManager.js', () => ({
  PollingManager: jest.fn(() => ({
    start: mockStartPolling,
  })),
}));

const { App } = await import('../src/App.js');

describe('App', () => {
  let app;
  const config = {
    CDP_PORTS: [1234],
    POLL_INTERVAL: 100,
    PORT: 3000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    app = new App(config);
  });

  it('should initialize and start correctly', async () => {
    mockFindEndpoint.mockResolvedValue({ port: 9222, url: 'ws://localhost:9222' });
    mockConnect.mockResolvedValue();

    await app.initialize();
    await app.start();

    // Verify CDP Discovery
    expect(mockFindEndpoint).toHaveBeenCalled();

    // Verify CDP Connection
    expect(mockConnect).toHaveBeenCalledWith('ws://localhost:9222');

    // Verify Server Start
    expect(mockServer.listen).toHaveBeenCalledWith(3000, '0.0.0.0', expect.any(Function));

    // Verify Polling Start
    expect(mockStartPolling).toHaveBeenCalled();
  });
});
