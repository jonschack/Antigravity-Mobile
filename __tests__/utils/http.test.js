import { jest } from '@jest/globals';
import http from 'http';
import EventEmitter from 'events';

// Since we are mocking a built-in node module 'http', we should use jest.unstable_mockModule
// for ESM support or just rely on jest.mock if using babel-jest (which we likely aren't).
// However, with `NODE_OPTIONS=--experimental-vm-modules`, jest.mock often works for built-ins if hoisted properly.
// But `http` is a default export or named export? In Node it is default mostly but also named.
// Let's try mocking 'http' with unstable_mockModule which is safer for ESM.

// We need to define the mock factory before importing the module under test.

const mockGet = jest.fn();

// Mock response object
class MockResponse extends EventEmitter {}

jest.unstable_mockModule('http', () => ({
  default: {
    get: mockGet,
  },
  // If the code uses named import `import { get } from 'http'`, we need this too.
  // The code uses `import http from 'http'; http.get(...)`.
}));

describe('HTTP Utility', () => {
  let getJson;

  beforeEach(async () => {
    mockGet.mockReset();
    // Dynamic import to ensure mock is applied
    const module = await import('../../src/utils/http.js');
    getJson = module.getJson;
  });

  it('should resolve with parsed JSON on success', async () => {
    const mockRes = new MockResponse();
    mockGet.mockImplementation((url, callback) => {
      callback(mockRes);
      return { on: jest.fn() }; // return req object with error handler
    });

    const promise = getJson('http://example.com');

    // Simulate data
    mockRes.emit('data', '{"key": "value"}');
    mockRes.emit('end');

    const result = await promise;
    expect(result).toEqual({ key: 'value' });
    expect(mockGet).toHaveBeenCalledWith('http://example.com', expect.any(Function));
  });

  it('should reject on JSON parse error', async () => {
    const mockRes = new MockResponse();
    mockGet.mockImplementation((url, callback) => {
      callback(mockRes);
      return { on: jest.fn() };
    });

    const promise = getJson('http://example.com');

    mockRes.emit('data', 'invalid json');
    mockRes.emit('end');

    await expect(promise).rejects.toThrow();
  });

  it('should reject on request error', async () => {
    const mockReq = { on: jest.fn() };
    mockGet.mockImplementation(() => mockReq);

    const promise = getJson('http://example.com');

    // Simulate error on request object
    const errorCallback = mockReq.on.mock.calls.find(call => call[0] === 'error')[1];
    errorCallback(new Error('Network error'));

    await expect(promise).rejects.toThrow('Network error');
  });
});
