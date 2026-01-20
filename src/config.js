const DEFAULT_PORTS = [9000, 9001, 9002, 9003];
const DEFAULT_POLL_INTERVAL = 3000;

const parsePorts = (value) => {
  if (!value) return DEFAULT_PORTS;

  const ports = value
    .split(',')
    .map((port) => port.trim())
    .filter((port) => port.length > 0);

  if (ports.length === 0) {
    throw new Error('CDP_PORTS must contain at least one port');
  }

  const parsed = ports.map((port) => Number(port));
  const hasInvalid = parsed.some(
    (port) => !Number.isInteger(port) || port <= 0 || port > 65535,
  );
  if (hasInvalid) {
    throw new Error('CDP_PORTS must be a comma-separated list of valid ports');
  }

  return parsed;
};

const parsePollInterval = (value) => {
  if (!value) return DEFAULT_POLL_INTERVAL;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('POLL_INTERVAL must be a positive integer');
  }

  return parsed;
};

const DEFAULT_BIND_ADDRESS = '0.0.0.0';

// IPv4 address pattern
const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
// IPv6 address pattern - covers common formats including compressed (::1, ::, 2001:db8::1)
const IPV6_PATTERN = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
// Hostname pattern - allows single character segments and standard hostnames
const HOSTNAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$|^[a-zA-Z0-9]$/;

const isValidIPv4 = (value) => {
  if (!IPV4_PATTERN.test(value)) return false;
  const octets = value.split('.').map(Number);
  return octets.every(octet => octet >= 0 && octet <= 255);
};

const isValidIPv6 = (value) => IPV6_PATTERN.test(value);

const looksLikeIPv4 = (value) => IPV4_PATTERN.test(value);

const isValidHostname = (value) => {
  // Must match hostname pattern AND contain at least one letter
  // (to distinguish from invalid IP addresses like 256.1.1.1)
  return HOSTNAME_PATTERN.test(value) && /[a-zA-Z]/.test(value);
};

const parseBindAddress = (value) => {
  if (!value) return DEFAULT_BIND_ADDRESS;

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('BIND_ADDRESS must be a non-empty string');
  }

  // Special case: if it looks like an IPv4 but has invalid octets, reject early
  if (looksLikeIPv4(trimmed) && !isValidIPv4(trimmed)) {
    throw new Error(
      'BIND_ADDRESS must be a valid IPv4 address (e.g., 0.0.0.0), ' +
      'IPv6 address, or hostname'
    );
  }

  // Validate format: must be valid IPv4, IPv6, or hostname
  if (!isValidIPv4(trimmed) && !isValidIPv6(trimmed) && !isValidHostname(trimmed)) {
    throw new Error(
      'BIND_ADDRESS must be a valid IPv4 address (e.g., 0.0.0.0), ' +
      'IPv6 address, or hostname'
    );
  }

  return trimmed;
};

export const PORTS = parsePorts(process.env.CDP_PORTS);
export const POLL_INTERVAL = parsePollInterval(process.env.POLL_INTERVAL);
export const BIND_ADDRESS = parseBindAddress(process.env.BIND_ADDRESS);
