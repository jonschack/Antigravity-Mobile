import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

const mockGet = jest.fn();

jest.unstable_mockModule('http', () => ({
  default: {
    get: mockGet,
  },
}));

const { getJson } = await import('../../src/utils/http.js');

describe('http utils', () => {
  describe('getJson', () => {
    beforeEach(() => {
      mockGet.mockClear();
    });

    it('should resolve with parsed JSON on success', async () => {
      const mockResponse = new EventEmitter();
      mockResponse.statusCode = 200;

      const requestMock = new EventEmitter();

      mockGet.mockImplementation((_url, callback) => {
        callback(mockResponse);
        return requestMock;
      });

      const promise = getJson('http://example.com/data');

      mockResponse.emit('data', '{"foo":');
      mockResponse.emit('data', '"bar"}');
      mockResponse.emit('end');

      const result = await promise;
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should reject if JSON parsing fails', async () => {
      const mockResponse = new EventEmitter();
      mockResponse.statusCode = 200;
      const requestMock = new EventEmitter();

      mockGet.mockImplementation((_url, callback) => {
        callback(mockResponse);
        return requestMock;
      });

      const promise = getJson('http://example.com/data');

      mockResponse.emit('data', 'invalid json');
      mockResponse.emit('end');

      await expect(promise).rejects.toThrow();
    });

    it('should reject on http error', async () => {
      const requestMock = new EventEmitter();
      mockGet.mockImplementation(() => requestMock);

      const promise = getJson('http://example.com/data');
      requestMock.emit('error', new Error('Network error'));

      await expect(promise).rejects.toThrow('Network error');
    });

    it('should reject on non-200 status code', async () => {
      const mockResponse = new EventEmitter();
      mockResponse.statusCode = 404;
      const requestMock = new EventEmitter();

      mockGet.mockImplementation((_url, callback) => {
        callback(mockResponse);
        return requestMock;
      });

      const promise = getJson('http://example.com/data');

      await expect(promise).rejects.toThrow('Request failed with status code 404');
    });
  });
});
