export const PORTS = process.env.CDP_PORTS
  ? process.env.CDP_PORTS.split(',').map((p) => parseInt(p.trim(), 10))
  : [9000, 9001, 9002, 9003];

export const POLL_INTERVAL = process.env.POLL_INTERVAL
  ? parseInt(process.env.POLL_INTERVAL, 10)
  : 3000;
