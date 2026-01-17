import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

const mockWsInstance = new EventEmitter();
mockWsInstance.send = jest.fn();
mockWsInstance.close = jest.fn();

const mockWsConstructor = jest.fn(() => mockWsInstance);

jest.unstable_mockModule('ws', () => ({
  default: mockWsConstructor,
  WebSocket: mockWsConstructor
}));

const { CdpClient } = await import('../../src/services/CdpClient.js');

describe('CdpClient', () => {
  let client;

  beforeEach(() => {
    mockWsConstructor.mockClear();
    mockWsInstance.removeAllListeners();
    mockWsInstance.send.mockClear();
    mockWsInstance.close.mockClear();
    client = new CdpClient();
  });

  it('should connect successfully', async () => {
    const connectPromise = client.connect('ws://test');
    mockWsInstance.emit('open');

    // It waits for 1 second after Runtime.enable
    // We need to handle the call to Runtime.enable

    // Simulate response for Runtime.enable
    // But since call() waits for a message with ID, we need to emit that.

    // Wait for the send call
    await new Promise(r => setTimeout(r, 0));

    expect(mockWsInstance.send).toHaveBeenCalled();
    const sendCall = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
    expect(sendCall.method).toBe('Runtime.enable');

    mockWsInstance.emit('message', JSON.stringify({ id: sendCall.id, result: {} }));

    await connectPromise;
    expect(client.isConnected).toBe(true);
  });

  it('should track execution contexts', async () => {
    const connectPromise = client.connect('ws://test');
    mockWsInstance.emit('open');

    await new Promise(r => setTimeout(r, 0));
    const sendCall = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
    mockWsInstance.emit('message', JSON.stringify({ id: sendCall.id, result: {} }));

    mockWsInstance.emit('message', JSON.stringify({
        method: 'Runtime.executionContextCreated',
        params: { context: { id: 1, name: 'ctx1' } }
    }));

    await connectPromise;

    expect(client.contexts).toHaveLength(1);
    expect(client.contexts[0]).toEqual({ id: 1, name: 'ctx1' });
  });

  it('should call methods and return result', async () => {
    // Setup connection
    const connectPromise = client.connect('ws://test');
    mockWsInstance.emit('open');
    await new Promise(r => setTimeout(r, 0));
    const enableCall = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
    mockWsInstance.emit('message', JSON.stringify({ id: enableCall.id, result: {} }));
    await connectPromise;

    // Call method
    const callPromise = client.call('Some.method', { foo: 'bar' });

    expect(mockWsInstance.send).toHaveBeenCalledTimes(2);
    const methodCall = JSON.parse(mockWsInstance.send.mock.calls[1][0]);
    expect(methodCall.method).toBe('Some.method');
    expect(methodCall.params).toEqual({ foo: 'bar' });

    // Respond
    mockWsInstance.emit('message', JSON.stringify({ id: methodCall.id, result: { success: true } }));

    const result = await callPromise;
    expect(result).toEqual({ success: true });
  });

  it('should handle errors from calls', async () => {
    // Setup connection
    const connectPromise = client.connect('ws://test');
    mockWsInstance.emit('open');
    await new Promise(r => setTimeout(r, 0));
    const enableCall = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
    mockWsInstance.emit('message', JSON.stringify({ id: enableCall.id, result: {} }));
    await connectPromise;

    const callPromise = client.call('Some.method', {});
    const methodCall = JSON.parse(mockWsInstance.send.mock.calls[1][0]);

    mockWsInstance.emit('message', JSON.stringify({ id: methodCall.id, error: { message: 'Failed' } }));

    await expect(callPromise).rejects.toEqual({ message: 'Failed' });
  });

  it('should throw if not connected', async () => {
    await expect(client.call('Foo.bar', {})).rejects.toThrow('Not connected');
  });
});
