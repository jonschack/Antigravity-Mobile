/**
 * Computes a simple hash for a string.
 * @param {string} str - The input string.
 * @returns {string} - The computed hash as a base-36 string.
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
