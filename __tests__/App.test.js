import { jest } from '@jest/globals';

const mockListen = jest.fn((port, host, cb) => cb && cb());
const mockClose = jest.fn((cb) => cb && cb());
const mockServer = {
  listen: mockListen,
  close: mockClose,
};
const mockExpressApp = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
};
const mockExpress = jest.fn(() => mockExpressApp);
mockExpress.static = jest.fn();
mockExpress.json = jest.fn();

const mockWssClose = jest.fn((cb) => cb && cb());
const mockWssInstance = {
  on: jest.fn(),
  close: mockWssClose,
  clients: new Set(),
};
const mockWebSocketServer = jest.fn(() => mockWssInstance);

const mockFindEndpoint = jest.fn();
const mockConnect = jest.fn();
const mockCdpClose = jest.fn();
const mockStartPolling = jest.fn();
const mockStopPolling = jest.fn();
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
    close: mockCdpClose,
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
    stop: mockStopPolling,
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

  describe('stop()', () => {
    let consoleErrorSpy;

    beforeEach(async () => {
      mockFindEndpoint.mockResolvedValue({ port: 9222, url: 'ws://localhost:9222' });
      mockConnect.mockResolvedValue();
      await app.initialize();
      await app.start();
    });

    afterEach(() => {
      if (consoleErrorSpy) {
        consoleErrorSpy.mockRestore();
        consoleErrorSpy = null;
      }
    });

    const expectConsoleErrorWith = async (mockImpl, errorMessage) => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockImpl();
      await app.stop();
      expect(consoleErrorSpy).toHaveBeenCalledWith(errorMessage, expect.any(Error));
    };

    it('should stop polling manager when stop is called', async () => {
      await app.stop();
      expect(mockStopPolling).toHaveBeenCalled();
    });

    it('should close CDP client connection when stop is called', async () => {
      await app.stop();
      expect(mockCdpClose).toHaveBeenCalled();
    });

    it('should close all WebSocket clients when stop is called', async () => {
      const mockClient = {
        readyState: 1, // WebSocket.OPEN
        close: jest.fn(),
      };
      mockWssInstance.clients = new Set([mockClient]);

      await app.stop();

      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should close WebSocket server when stop is called', async () => {
      await app.stop();
      expect(mockWssClose).toHaveBeenCalled();
    });

    it('should close HTTP server when stop is called', async () => {
      await app.stop();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle errors gracefully when stopping polling manager fails', async () => {
      await expectConsoleErrorWith(
        () => mockStopPolling.mockImplementation(() => { throw new Error('Polling stop failed'); }),
        'Error while stopping polling manager:'
      );
    });

    it('should handle errors gracefully when closing CDP client fails', async () => {
      await expectConsoleErrorWith(
        () => mockCdpClose.mockImplementation(() => { throw new Error('CDP close failed'); }),
        'Error while closing CDP client:'
      );
    });

    it('should handle errors gracefully when closing WebSocket client fails', async () => {
      const mockClient = {
        readyState: 1,
        close: jest.fn(() => { throw new Error('Client close failed'); }),
      };
      mockWssInstance.clients = new Set([mockClient]);

      await expectConsoleErrorWith(
        () => {},
        'Error while closing WebSocket client:'
      );
    });

    it('should handle errors gracefully when closing WebSocket server fails', async () => {
      await expectConsoleErrorWith(
        () => mockWssClose.mockImplementation(() => { throw new Error('WSS close failed'); }),
        'Error while closing WebSocket server:'
      );
    });

    it('should handle errors gracefully when closing HTTP server fails', async () => {
      await expectConsoleErrorWith(
        () => mockClose.mockImplementation((cb) => cb(new Error('Server close failed'))),
        'Error while closing HTTP server:'
      );
    });

    it('should handle stop being called when services are not initialized', async () => {
      const uninitializedApp = new App(config);
      await expect(uninitializedApp.stop()).resolves.not.toThrow();
    });

    it('should handle stop being called when polling manager has no stop method', async () => {
      app.pollingManager = {};
      await expect(app.stop()).resolves.not.toThrow();
    });

    it('should handle stop being called when CDP client has neither disconnect nor close', async () => {
      app.cdpClient = {};
      await expect(app.stop()).resolves.not.toThrow();
    });

    it('should only close WebSocket clients that are in OPEN state', async () => {
      const openClient = {
        readyState: 1, // OPEN
        close: jest.fn(),
      };
      const closingClient = {
        readyState: 2, // CLOSING
        close: jest.fn(),
      };
      const closedClient = {
        readyState: 3, // CLOSED
        close: jest.fn(),
      };
      mockWssInstance.clients = new Set([openClient, closingClient, closedClient]);

      await app.stop();

      expect(openClient.close).toHaveBeenCalled();
      expect(closingClient.close).not.toHaveBeenCalled();
      expect(closedClient.close).not.toHaveBeenCalled();
    });
  });
});
