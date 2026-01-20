#!/usr/bin/env node
import http from 'http';
import WebSocket from 'ws';
import { createApp } from './app.js';
import { createWebSocketServer } from './websocket.js';
import { PORTS, POLL_INTERVAL } from './config.js';

import { CdpDiscoveryService } from './services/CdpDiscoveryService.js';
import { CdpClient } from './services/CdpClient.js';
import { SnapshotService } from './services/SnapshotService.js';
import { MessageInjectionService } from './services/MessageInjectionService.js';
import { PollingManager } from './services/PollingManager.js';

// TODO feature-app-bootstrap: Remove global state. Pass these dependencies via dependency injection or a context object.
let cdpClient = null;
let lastSnapshot = null;
let injectionService = null;

// Create Express app
async function createServer() {
  const app = createApp({
    getSnapshot: () => lastSnapshot,
    sendToCdp: async (message) => {
      if (!cdpClient || !cdpClient.isConnected) {
        throw new Error('CDP not connected');
      }
      if (!injectionService) {
        throw new Error('Injection service not initialized');
      }
      return await injectionService.inject(message);
    },
  });

  const server = http.createServer(app);
  const wss = createWebSocketServer(server);

  return { server, wss };
}

// TODO feature-app-bootstrap: Refactor into a clean composition root.
// Main
async function main() {
  try {
    const discoveryService = new CdpDiscoveryService(PORTS);
    console.log('🔍 Discovering VS Code CDP endpoint...');

    const cdpInfo = await discoveryService.findEndpoint();
    console.log(`✅ Found VS Code on port ${cdpInfo.port}`);

    console.log('🔌 Connecting to CDP...');
    cdpClient = new CdpClient();
    await cdpClient.connect(cdpInfo.url);

    console.log(
      `✅ Connected! Found ${cdpClient.contexts.length} execution contexts\n`,
    );

    // Initialize Services
    const snapshotService = new SnapshotService(cdpClient);
    injectionService = new MessageInjectionService(cdpClient);

    const { server, wss } = await createServer();

    // Start background polling
    const pollingManager = new PollingManager(
      snapshotService,
      POLL_INTERVAL,
      (snapshot) => {
        lastSnapshot = snapshot;
        console.log('📸 Snapshot updated');

        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: 'snapshot_update',
                timestamp: new Date().toISOString(),
              }),
            );
          }
        });
      },
    );

    pollingManager.start();

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📱 Access from mobile: http://<your-ip>:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
