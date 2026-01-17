import { jest } from '@jest/globals';
import { CdpDiscoveryService } from '../../src/services/CdpDiscoveryService.js';

describe('CdpDiscoveryService', () => {
  const PORTS = [9000, 9001];

  it('should return the port and url if found', async () => {
    const mockGetJson = jest.fn();
    mockGetJson.mockResolvedValueOnce([
        {
            url: 'file:///workbench.html',
            webSocketDebuggerUrl: 'ws://127.0.0.1:9000/ws-uuid'
        }
    ]);

    const service = new CdpDiscoveryService(PORTS, mockGetJson);
    const result = await service.findEndpoint();

    expect(result).toEqual({ port: 9000, url: 'ws://127.0.0.1:9000/ws-uuid' });
    expect(mockGetJson).toHaveBeenCalledWith('http://127.0.0.1:9000/json/list');
  });

  it('should search multiple ports', async () => {
    const mockGetJson = jest.fn();
    // First port fails or returns empty
    mockGetJson.mockRejectedValueOnce(new Error('Connection refused'));
    // Second port succeeds
    mockGetJson.mockResolvedValueOnce([
        {
            title: 'workbench',
            webSocketDebuggerUrl: 'ws://127.0.0.1:9001/ws-uuid'
        }
    ]);

    const service = new CdpDiscoveryService(PORTS, mockGetJson);
    const result = await service.findEndpoint();

    expect(result).toEqual({ port: 9001, url: 'ws://127.0.0.1:9001/ws-uuid' });
    expect(mockGetJson).toHaveBeenCalledTimes(2);
  });

  it('should throw if no workbench found', async () => {
    const mockGetJson = jest.fn();
    mockGetJson.mockResolvedValue([]); // Empty list for all ports

    const service = new CdpDiscoveryService(PORTS, mockGetJson);

    await expect(service.findEndpoint()).rejects.toThrow('CDP not found');
  });
});
