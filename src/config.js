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

const parseBindAddress = (value) => {
  if (!value) return DEFAULT_BIND_ADDRESS;

  // Basic validation: must be non-empty string
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('BIND_ADDRESS must be a non-empty string');
  }

  return trimmed;
};

export const PORTS = parsePorts(process.env.CDP_PORTS);
export const POLL_INTERVAL = parsePollInterval(process.env.POLL_INTERVAL);
export const BIND_ADDRESS = parseBindAddress(process.env.BIND_ADDRESS);
