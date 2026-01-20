import os from 'os';

// Known Tailscale interface name patterns across platforms
const TAILSCALE_INTERFACE_PATTERNS = [
  /^tailscale\d*$/i,  // Linux: tailscale0, tailscale1, etc.
  /^utun\d+$/,        // macOS: utun0, utun1, etc. (Tailscale uses these)
  /^ts\d+$/,          // Windows: ts0, ts1, etc.
];

/**
 * Checks if an interface name matches known Tailscale patterns.
 * @param {string} name - Interface name to check
 * @returns {boolean} True if it matches a known Tailscale pattern
 */
function isTailscaleInterface(name) {
  return TAILSCALE_INTERFACE_PATTERNS.some(pattern => pattern.test(name));
}

/**
 * Detects Tailscale IP addresses from network interfaces.
 * Looks for known Tailscale interface patterns or IPs in the 100.64.0.0/10 CGNAT range.
 * @returns {string[]} Array of detected Tailscale IP addresses
 */
export function detectTailscaleIPs() {
  const interfaces = os.networkInterfaces();
  const tailscaleIPs = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (!addresses) continue;

    for (const addr of addresses) {
      // Skip IPv6 and internal addresses
      if (addr.family !== 'IPv4' || addr.internal) continue;

      // Check for known Tailscale interface name patterns
      if (isTailscaleInterface(name)) {
        tailscaleIPs.push(addr.address);
        continue;
      }

      // Check for Tailscale CGNAT range (100.64.0.0/10 -> 100.64.x.x to 100.127.x.x)
      if (isTailscaleCGNATAddress(addr.address)) {
        tailscaleIPs.push(addr.address);
      }
    }
  }

  return tailscaleIPs;
}

/**
 * Checks if an IP address is in the Tailscale CGNAT range (100.64.0.0/10).
 * @param {string} ip - IPv4 address to check
 * @returns {boolean} True if the address is in the Tailscale CGNAT range
 */
export function isTailscaleCGNATAddress(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  const firstOctet = parseInt(parts[0], 10);
  const secondOctet = parseInt(parts[1], 10);

  // Tailscale uses 100.64.0.0/10, which means:
  // First octet: 100
  // Second octet: 64-127 (binary: 01xxxxxx)
  return firstOctet === 100 && secondOctet >= 64 && secondOctet <= 127;
}

/**
 * Gets the primary Tailscale IP (first detected one).
 * @returns {string|null} The first detected Tailscale IP or null if none found
 */
export function getPrimaryTailscaleIP() {
  const ips = detectTailscaleIPs();
  return ips.length > 0 ? ips[0] : null;
}
