import { jest } from '@jest/globals';
import { SnapshotService } from '../../src/services/SnapshotService.js';
import { CAPTURE_SCRIPT } from '../../src/scripts/capture.js';

describe('SnapshotService', () => {
  let mockCdpClient;
  let service;

  beforeEach(() => {
    mockCdpClient = {
      contexts: [],
      call: jest.fn(),
    };
    service = new SnapshotService(mockCdpClient);
  });

  it('should return null if no contexts available', async () => {
    const result = await service.capture();
    expect(result).toBeNull();
  });

  it('should try each context and return result on success', async () => {
    mockCdpClient.contexts = [{ id: 1 }, { id: 2 }];

    // First context fails
    mockCdpClient.call.mockRejectedValueOnce(new Error('Failed'));

    // Second context succeeds
    const expectedResult = { html: '<div></div>', css: '' };
    mockCdpClient.call.mockResolvedValueOnce({
      result: {
        value: expectedResult
      }
    });

    const result = await service.capture();

    expect(result).toEqual(expectedResult);
    expect(mockCdpClient.call).toHaveBeenCalledTimes(2);
    expect(mockCdpClient.call).toHaveBeenCalledWith('Runtime.evaluate', {
      expression: CAPTURE_SCRIPT,
      returnByValue: true,
      contextId: 1
    });
    expect(mockCdpClient.call).toHaveBeenCalledWith('Runtime.evaluate', {
      expression: CAPTURE_SCRIPT,
      returnByValue: true,
      contextId: 2
    });
  });

  it('should return null if all contexts fail', async () => {
    mockCdpClient.contexts = [{ id: 1 }];
    mockCdpClient.call.mockResolvedValue({ result: {} }); // no value

    const result = await service.capture();
    expect(result).toBeNull();
  });
});
