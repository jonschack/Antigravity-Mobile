import os from 'os';

/**
 * Detects Tailscale IP addresses from network interfaces.
 * Looks for 'tailscale0' interface or IPs in the 100.x.x.x CGNAT range used by Tailscale.
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

      // Check for tailscale interface name
      if (name.toLowerCase().includes('tailscale')) {
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
