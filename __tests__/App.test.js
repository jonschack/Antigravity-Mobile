import { jest } from '@jest/globals';

const mockListen = jest.fn((port, host, cb) => cb && cb());
const mockOnServer = jest.fn();
const mockServer = {
  listen: mockListen,
  on: mockOnServer,
};
const mockAppUse = jest.fn();
const mockAppGet = jest.fn();
const mockAppPost = jest.fn();
const mockExpressApp = {
  use: mockAppUse,
  get: mockAppGet,
  post: mockAppPost,
};
const mockExpress = jest.fn(() => mockExpressApp);
mockExpress.static = jest.fn();
mockExpress.json = jest.fn();

const mockWebSocketServerOn = jest.fn();
const mockWebSocketServerClients = new Set();
const mockWebSocketServer = jest.fn(function() {
    this.on = mockWebSocketServerOn;
    this.clients = mockWebSocketServerClients;
});

const mockFindEndpoint = jest.fn();
const mockConnect = jest.fn();
const mockStartPolling = jest.fn();
const mockInject = jest.fn();

// Create a mock PollingManager class explicitly so we can export it and use it in tests
const MockPollingManager = jest.fn(() => ({
    start: mockStartPolling,
}));

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
  PollingManager: MockPollingManager,
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
    mockWebSocketServerClients.clear();
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

  it('should throw error if config is invalid', () => {
      expect(() => new App({})).toThrow('Invalid configuration');
      expect(() => new App({ CDP_PORTS: [] })).toThrow('Invalid configuration');
  });

  it('should throw error if start() is called before initialize()', async () => {
      await expect(app.start()).rejects.toThrow('App not initialized');
  });

  it('should handle CDP discovery failure', async () => {
      mockFindEndpoint.mockRejectedValue(new Error('Discovery failed'));
      await expect(app.initialize()).rejects.toThrow('Discovery failed');
  });

  it('should handle server listen failure', async () => {
      mockFindEndpoint.mockResolvedValue({ port: 9222, url: 'ws://localhost:9222' });
      mockConnect.mockResolvedValue();

      // Only mock implementation for this test to avoid affecting others
      mockServer.listen.mockImplementationOnce((port, host, cb) => {
           // Do not call cb, waiting for error
      });

      await app.initialize();
      const promise = app.start();

      // Find the error handler attached to the server
      const errorCall = mockOnServer.mock.calls.find(call => call[0] === 'error');
      if (errorCall) {
          const errorHandler = errorCall[1];
          errorHandler(new Error('EADDRINUSE'));
      }

      await expect(promise).rejects.toThrow('EADDRINUSE');
  });

  describe('Endpoints', () => {
      beforeEach(async () => {
          mockFindEndpoint.mockResolvedValue({ port: 9222, url: 'ws://localhost:9222' });
          await app.initialize();
      });

      it('GET /snapshot should return 503 if no snapshot', () => {
          const handler = mockAppGet.mock.calls.find(call => call[0] === '/snapshot')[1];
          const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
          handler({}, res);
          expect(res.status).toHaveBeenCalledWith(503);
          expect(res.json).toHaveBeenCalledWith({ error: 'No snapshot available yet' });
      });

      it('GET /snapshot should return snapshot if available', () => {
           const pollingCallback = MockPollingManager.mock.calls[0][2];

           const snapshot = { data: 'test' };
           pollingCallback(snapshot);

           const handler = mockAppGet.mock.calls.find(call => call[0] === '/snapshot')[1];
           const res = { json: jest.fn() };
           handler({}, res);
           expect(res.json).toHaveBeenCalledWith(snapshot);
      });

      it('POST /send should return 400 if message missing', async () => {
          const handler = mockAppPost.mock.calls.find(call => call[0] === '/send')[1];
          const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
          await handler({ body: {} }, res);
          expect(res.status).toHaveBeenCalledWith(400);
      });

      it('POST /send should call inject and return result', async () => {
          mockInject.mockResolvedValue({ ok: true, method: 'test' });
          const handler = mockAppPost.mock.calls.find(call => call[0] === '/send')[1];
          const res = { json: jest.fn() };
          await handler({ body: { message: 'hello' } }, res);
          expect(mockInject).toHaveBeenCalledWith('hello');
          expect(res.json).toHaveBeenCalledWith({ success: true, method: 'test' });
      });
  });

  describe('WebSocket', () => {
     it('should broadcast snapshot updates', async () => {
        mockFindEndpoint.mockResolvedValue({ port: 9222, url: 'ws://localhost:9222' });
        await app.initialize();

        const pollingCallback = MockPollingManager.mock.calls[0][2];

        // Mock a client
        const mockClient = { readyState: 1, send: jest.fn() };
        mockWebSocketServerClients.add(mockClient);

        pollingCallback({ data: 'new' });

        expect(mockClient.send).toHaveBeenCalled();
        const msg = JSON.parse(mockClient.send.mock.calls[0][0]);
        expect(msg.type).toBe('snapshot_update');
     });

     it('should handle client connection', async () => {
         mockFindEndpoint.mockResolvedValue({ port: 9222, url: 'ws://localhost:9222' });
         await app.initialize();

         const connectionHandler = mockWebSocketServerOn.mock.calls.find(call => call[0] === 'connection')[1];
         const mockWs = { on: jest.fn() };
         connectionHandler(mockWs);

         // Verify logs or just that it attaches close listener
         expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
     });
  });
});
