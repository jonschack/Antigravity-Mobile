import { jest } from '@jest/globals';

describe('Config Module', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should return default values when no environment variables are set', async () => {
    const config = await import('../src/config.js');
    expect(config.PORTS).toEqual([9000, 9001, 9002, 9003]);
    expect(config.POLL_INTERVAL).toBe(3000);
    expect(config.BIND_ADDRESS).toBe('0.0.0.0');
  });

  it('should use POLL_INTERVAL from environment variable', async () => {
    process.env.POLL_INTERVAL = '5000';
    const config = await import('../src/config.js');
    expect(config.POLL_INTERVAL).toBe(5000);
  });

  it('should use CDP_PORTS from environment variable (comma separated)', async () => {
    process.env.CDP_PORTS = '8000,8001';
    const config = await import('../src/config.js');
    expect(config.PORTS).toEqual([8000, 8001]);
  });

  it('should handle whitespace in CDP_PORTS', async () => {
    process.env.CDP_PORTS = ' 8000 , 8001 ';
    const config = await import('../src/config.js');
    expect(config.PORTS).toEqual([8000, 8001]);
  });

  it('should throw on invalid POLL_INTERVAL', async () => {
    process.env.POLL_INTERVAL = 'abc';
    await expect(import('../src/config.js')).rejects.toThrow(
      'POLL_INTERVAL must be a positive integer',
    );
  });

  it('should throw on invalid CDP_PORTS', async () => {
    process.env.CDP_PORTS = '8000,abc';
    await expect(import('../src/config.js')).rejects.toThrow(
      'CDP_PORTS must be a comma-separated list of valid ports',
    );
  });

  it('should use BIND_ADDRESS from environment variable', async () => {
    process.env.BIND_ADDRESS = '127.0.0.1';
    const config = await import('../src/config.js');
    expect(config.BIND_ADDRESS).toBe('127.0.0.1');
  });

  it('should trim whitespace from BIND_ADDRESS', async () => {
    process.env.BIND_ADDRESS = '  192.168.1.1  ';
    const config = await import('../src/config.js');
    expect(config.BIND_ADDRESS).toBe('192.168.1.1');
  });

  it('should throw on empty BIND_ADDRESS', async () => {
    process.env.BIND_ADDRESS = '   ';
    await expect(import('../src/config.js')).rejects.toThrow(
      'BIND_ADDRESS must be a non-empty string',
    );
  });
});
