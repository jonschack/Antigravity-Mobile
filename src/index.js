#!/usr/bin/env node
import { App } from './App.js';
import { PORTS, POLL_INTERVAL } from './config.js';

// Main
async function main() {
  try {
    const config = {
      ports: PORTS,
      pollInterval: POLL_INTERVAL,
      port: process.env.PORT || 3000,
    };

    const app = new App(config);
    await app.start();

    // Handle graceful shutdown
    const shutdown = async () => {
      await app.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
