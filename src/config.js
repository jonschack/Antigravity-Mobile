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

export const PORTS = parsePorts(process.env.CDP_PORTS);
export const POLL_INTERVAL = parsePollInterval(process.env.POLL_INTERVAL);
// TODO feature-backend-tailscale-config: Add BIND_ADDRESS to exports to allow binding to specific interfaces (default to 0.0.0.0).
