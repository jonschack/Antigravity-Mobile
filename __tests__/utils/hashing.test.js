import { hashString } from '../../src/utils/hashing.js';

describe('hashing utils', () => {
  describe('hashString', () => {
    it('should return a consistent hash for the same string', () => {
      const str = 'some test string';
      expect(hashString(str)).toBe(hashString(str));
    });

    it('should return different hashes for different strings', () => {
      expect(hashString('abc')).not.toBe(hashString('abd'));
    });

    it('should handle empty string', () => {
      expect(hashString('')).toBe('0');
    });
  });
});
