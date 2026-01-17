export const CONFIG = {
  CDP_PORTS: [9000, 9001, 9002, 9003],
  POLL_INTERVAL: 3000,
  get PORT() {
    return process.env.PORT || 3000;
  },
};
