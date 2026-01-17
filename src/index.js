#!/usr/bin/env node
import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { CdpDiscoveryService } from './services/CdpDiscoveryService.js';
import { CdpClient } from './services/CdpClient.js';
import { SnapshotService } from './services/SnapshotService.js';
import { MessageInjectionService } from './services/MessageInjectionService.js';
import { PollingManager } from './services/PollingManager.js';
import { PORTS, POLL_INTERVAL } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// TODO feature-app-bootstrap: Remove global state. Pass these dependencies via dependency injection or a context object.
// Shared CDP connection
let cdpClient = null;
let lastSnapshot = null;
let injectionService = null;

// TODO feature-http-layer: Extract Express app creation into src/app.js.
// TODO feature-http-layer: Add tests for HTTP endpoints (e.g. using supertest).
// TODO feature-websocket-layer: Extract WebSocket logic into a WebSocketController or similar.
// TODO feature-websocket-layer: Add tests for WebSocket logic.
// Create Express app
async function createServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());
  app.use(express.static(join(__dirname, '../public')));

  // Get current snapshot
  app.get('/snapshot', (req, res) => {
    if (!lastSnapshot) {
      return res.status(503).json({ error: 'No snapshot available yet' });
    }
    res.json(lastSnapshot);
  });

  // Send message
  app.post('/send', async (req, res) => {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    if (!cdpClient || !cdpClient.isConnected) {
      return res.status(503).json({ error: 'CDP not connected' });
    }

    if (!injectionService) {
        return res.status(500).json({ error: 'Injection service not initialized' });
    }

    const result = await injectionService.inject(message);

    if (result.ok) {
      res.json({ success: true, method: result.method });
    } else {
      res.status(500).json({ success: false, reason: result.reason });
    }
  });

  // WebSocket connection
  wss.on('connection', (ws) => {
    console.log('📱 Client connected');

    ws.on('close', () => {
      console.log('📱 Client disconnected');
    });
  });

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

    const { server, wss } = await createServer();

    // Initialize Services
    const snapshotService = new SnapshotService(cdpClient);
    injectionService = new MessageInjectionService(cdpClient);

    // Start background polling
    const pollingManager = new PollingManager(snapshotService, POLL_INTERVAL, (snapshot) => {
        lastSnapshot = snapshot;
        console.log(`📸 Snapshot updated`);

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
    });

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
