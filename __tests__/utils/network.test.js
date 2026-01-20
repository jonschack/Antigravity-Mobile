import { jest } from '@jest/globals';
import os from 'os';
import {
  detectTailscaleIPs,
  isTailscaleCGNATAddress,
  getPrimaryTailscaleIP,
} from '../../src/utils/network.js';

describe('network utils', () => {
  describe('isTailscaleCGNATAddress', () => {
    it('should return true for valid Tailscale CGNAT addresses', () => {
      expect(isTailscaleCGNATAddress('100.64.0.1')).toBe(true);
      expect(isTailscaleCGNATAddress('100.100.100.100')).toBe(true);
      expect(isTailscaleCGNATAddress('100.127.255.255')).toBe(true);
      expect(isTailscaleCGNATAddress('100.80.45.67')).toBe(true);
    });

    it('should return false for non-Tailscale addresses', () => {
      expect(isTailscaleCGNATAddress('192.168.1.1')).toBe(false);
      expect(isTailscaleCGNATAddress('10.0.0.1')).toBe(false);
      expect(isTailscaleCGNATAddress('172.16.0.1')).toBe(false);
      expect(isTailscaleCGNATAddress('100.63.255.255')).toBe(false); // Just below range
      expect(isTailscaleCGNATAddress('100.128.0.0')).toBe(false); // Just above range
      expect(isTailscaleCGNATAddress('8.8.8.8')).toBe(false);
    });

    it('should return false for invalid IP formats', () => {
      expect(isTailscaleCGNATAddress('not-an-ip')).toBe(false);
      expect(isTailscaleCGNATAddress('100.64.0')).toBe(false);
      expect(isTailscaleCGNATAddress('')).toBe(false);
    });
  });

  describe('detectTailscaleIPs', () => {
    let originalNetworkInterfaces;

    beforeEach(() => {
      originalNetworkInterfaces = os.networkInterfaces;
    });

    afterEach(() => {
      os.networkInterfaces = originalNetworkInterfaces;
    });

    it('should detect Tailscale IPs from tailscale0 interface', () => {
      os.networkInterfaces = jest.fn(() => ({
        tailscale0: [
          { family: 'IPv4', address: '100.100.1.1', internal: false },
        ],
        eth0: [
          { family: 'IPv4', address: '192.168.1.100', internal: false },
        ],
      }));

      const ips = detectTailscaleIPs();
      expect(ips).toContain('100.100.1.1');
      expect(ips).not.toContain('192.168.1.100');
    });

    it('should detect Tailscale IPs from CGNAT range', () => {
      os.networkInterfaces = jest.fn(() => ({
        eth0: [
          { family: 'IPv4', address: '100.80.45.67', internal: false },
        ],
        lo: [
          { family: 'IPv4', address: '127.0.0.1', internal: true },
        ],
      }));

      const ips = detectTailscaleIPs();
      expect(ips).toContain('100.80.45.67');
    });

    it('should skip internal and IPv6 addresses', () => {
      os.networkInterfaces = jest.fn(() => ({
        tailscale0: [
          { family: 'IPv4', address: '100.100.1.1', internal: true },
          { family: 'IPv6', address: 'fd7a:115c:a1e0::1', internal: false },
        ],
      }));

      const ips = detectTailscaleIPs();
      expect(ips).toHaveLength(0);
    });

    it('should return empty array when no Tailscale IPs found', () => {
      os.networkInterfaces = jest.fn(() => ({
        eth0: [
          { family: 'IPv4', address: '192.168.1.100', internal: false },
        ],
      }));

      const ips = detectTailscaleIPs();
      expect(ips).toHaveLength(0);
    });

    it('should handle null addresses array', () => {
      os.networkInterfaces = jest.fn(() => ({
        eth0: null,
      }));

      const ips = detectTailscaleIPs();
      expect(ips).toHaveLength(0);
    });
  });

  describe('getPrimaryTailscaleIP', () => {
    let originalNetworkInterfaces;

    beforeEach(() => {
      originalNetworkInterfaces = os.networkInterfaces;
    });

    afterEach(() => {
      os.networkInterfaces = originalNetworkInterfaces;
    });

    it('should return first Tailscale IP', () => {
      os.networkInterfaces = jest.fn(() => ({
        tailscale0: [
          { family: 'IPv4', address: '100.100.1.1', internal: false },
        ],
      }));

      const ip = getPrimaryTailscaleIP();
      expect(ip).toBe('100.100.1.1');
    });

    it('should return null when no Tailscale IPs found', () => {
      os.networkInterfaces = jest.fn(() => ({
        eth0: [
          { family: 'IPv4', address: '192.168.1.100', internal: false },
        ],
      }));

      const ip = getPrimaryTailscaleIP();
      expect(ip).toBeNull();
    });
  });
});
