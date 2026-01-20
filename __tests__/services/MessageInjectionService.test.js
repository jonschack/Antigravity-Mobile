import { jest } from '@jest/globals';
import { MessageInjectionService } from '../../src/services/MessageInjectionService.js';
import { getInjectionScript } from '../../src/scripts/inject.js';

describe('MessageInjectionService', () => {
  let mockCdpClient;
  let service;

  beforeEach(() => {
    mockCdpClient = {
      contexts: [],
      call: jest.fn(),
    };
    service = new MessageInjectionService(mockCdpClient);
  });

  it('should return failure if no contexts available', async () => {
    const result = await service.inject('hello');
    expect(result).toEqual({ ok: false, reason: 'no_context' });
  });

  it('should try each context and return result on success', async () => {
    mockCdpClient.contexts = [{ id: 1 }, { id: 2 }];

    // First context fails (e.g. timeout or error)
    mockCdpClient.call.mockRejectedValueOnce(new Error('Failed'));

    // Second context succeeds
    const expectedResult = { ok: true, method: 'click_submit' };
    mockCdpClient.call.mockResolvedValueOnce({
      result: {
        value: expectedResult
      }
    });

    const result = await service.inject('hello');

    expect(result).toEqual(expectedResult);
    expect(mockCdpClient.call).toHaveBeenCalledTimes(2);
    expect(mockCdpClient.call).toHaveBeenCalledWith('Runtime.evaluate', {
      expression: getInjectionScript('hello'),
      returnByValue: true,
      awaitPromise: true,
      contextId: 1
    });
    expect(mockCdpClient.call).toHaveBeenCalledWith('Runtime.evaluate', {
      expression: getInjectionScript('hello'),
      returnByValue: true,
      awaitPromise: true,
      contextId: 2
    });
  });

  it('should return no_context if all contexts fail', async () => {
    mockCdpClient.contexts = [{ id: 1 }];
    mockCdpClient.call.mockResolvedValue({ result: {} }); // no value

    const result = await service.inject('hello');
    expect(result).toEqual({ ok: false, reason: 'no_context' });
  });

  it('should correctly escape special characters in injection script', () => {
    const message = 'Line 1\nLine "2"';
    const script = getInjectionScript(message);
    const expectedEscaped = JSON.stringify(message);
    expect(script).toContain(expectedEscaped);
  });
});
