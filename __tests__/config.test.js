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

  it('should fallback to defaults if invalid POLL_INTERVAL provided', async () => {
    process.env.POLL_INTERVAL = 'abc';
    const config = await import('../src/config.js');
    // When parseInt fails, should fallback to default value
    expect(config.POLL_INTERVAL).toBe(3000);
  });
});
