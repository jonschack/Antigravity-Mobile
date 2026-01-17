/**
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { APIService } from '../../../public/js/services/api.js';

describe('APIService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loadSnapshot', () => {
    test('should fetch snapshot successfully', async () => {
      const mockData = { html: '<div>test</div>', css: 'body { color: red; }' };
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await APIService.loadSnapshot();
      expect(global.fetch).toHaveBeenCalledWith('/snapshot');
      expect(result).toEqual(mockData);
    });

    test('should throw error when response is not ok', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
      });

      await expect(APIService.loadSnapshot()).rejects.toThrow('Failed to load snapshot');
    });
  });

  describe('sendMessage', () => {
    test('should send message successfully', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
      });

      await APIService.sendMessage('hello');
      expect(global.fetch).toHaveBeenCalledWith('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'hello' }),
      });
    });

    test('should throw error when send fails', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ reason: 'Server error' }),
      });

      await expect(APIService.sendMessage('hello')).rejects.toThrow('Server error');
    });

    test('should throw default error when reason is missing', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      await expect(APIService.sendMessage('hello')).rejects.toThrow('Unknown error');
    });
  });
});
