
describe('Hashing Utility', () => {
  it('should generate consistent hash for same input', async () => {
    const { hashString } = await import('../../src/utils/hashing.js');
    const input = 'test string';
    const hash1 = hashString(input);
    const hash2 = hashString(input);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different input', async () => {
    const { hashString } = await import('../../src/utils/hashing.js');
    expect(hashString('a')).not.toBe(hashString('b'));
  });

  it('should handle empty string', async () => {
    const { hashString } = await import('../../src/utils/hashing.js');
    expect(hashString('')).toBeDefined();
  });
});
