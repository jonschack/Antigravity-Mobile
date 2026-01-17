export const PORTS = process.env.CDP_PORTS
  ? process.env.CDP_PORTS.split(',').map((p) => parseInt(p.trim(), 10))
  : [9000, 9001, 9002, 9003];

export const POLL_INTERVAL = (() => {
  if (!process.env.POLL_INTERVAL) {
    return 3000;
  }
  const parsed = parseInt(process.env.POLL_INTERVAL, 10);
  return Number.isNaN(parsed) ? 3000 : parsed;
})();
