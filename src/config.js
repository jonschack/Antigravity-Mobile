const DEFAULT_PORTS = [9000, 9001, 9002, 9003];

const parsedPorts = process.env.CDP_PORTS
  ? process.env.CDP_PORTS.split(',')
      .map((p) => parseInt(p.trim(), 10))
      .filter((port) => Number.isInteger(port) && port > 0)
  : [];

export const PORTS = parsedPorts.length > 0 ? parsedPorts : DEFAULT_PORTS;
const DEFAULT_POLL_INTERVAL = 3000;

export const POLL_INTERVAL = (() => {
  const envValue = process.env.POLL_INTERVAL;
  if (!envValue) {
    return DEFAULT_POLL_INTERVAL;
  }
  const parsed = parseInt(envValue, 10);
  return Number.isNaN(parsed) ? DEFAULT_POLL_INTERVAL : parsed;
})();
