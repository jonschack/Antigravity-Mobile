#!/usr/bin/env node
import { App } from './App.js';
import { CONFIG } from './config.js';

// TODO feature-app-bootstrap: Refactor into a clean composition root.
// Main
async function main() {
  try {
    const app = new App(CONFIG);
    await app.initialize();
    await app.start();
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
