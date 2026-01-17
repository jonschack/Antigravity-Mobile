import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { CdpDiscoveryService } from './services/CdpDiscoveryService.js';
import { CdpClient } from './services/CdpClient.js';
import { SnapshotService } from './services/SnapshotService.js';
import { MessageInjectionService } from './services/MessageInjectionService.js';
import { PollingManager } from './services/PollingManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class App {
  constructor(config) {
    this.config = config;
    this.cdpClient = null;
    this.snapshotService = null;
    this.injectionService = null;
    this.pollingManager = null;
    this.server = null;
    this.wss = null;
    this.lastSnapshot = null;
    this.app = express();
  }

  async initialize() {
    // Discovery
    const discoveryService = new CdpDiscoveryService(this.config.CDP_PORTS);
    console.log('🔍 Discovering VS Code CDP endpoint...');
    const cdpInfo = await discoveryService.findEndpoint();
    console.log(`✅ Found VS Code on port ${cdpInfo.port}`);

    // CDP Connection
    console.log('🔌 Connecting to CDP...');
    this.cdpClient = new CdpClient();
    await this.cdpClient.connect(cdpInfo.url);
    console.log(`✅ Connected! Found ${this.cdpClient.contexts.length} execution contexts\n`);

    // Service Initialization
    this.snapshotService = new SnapshotService(this.cdpClient);
    this.injectionService = new MessageInjectionService(this.cdpClient);

    // Setup Web Server
    this._setupServer();

    // Setup Polling
    this.pollingManager = new PollingManager(
      this.snapshotService,
      this.config.POLL_INTERVAL,
      (snapshot) => this._onSnapshotUpdate(snapshot)
    );
  }

  _setupServer() {
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.app.use(express.json());
    this.app.use(express.static(join(__dirname, '../public')));

    // Get current snapshot
    this.app.get('/snapshot', (req, res) => {
      if (!this.lastSnapshot) {
        return res.status(503).json({ error: 'No snapshot available yet' });
      }
      res.json(this.lastSnapshot);
    });

    // Send message
    this.app.post('/send', async (req, res) => {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message required' });
      }

      if (!this.cdpClient || !this.cdpClient.isConnected) {
        return res.status(503).json({ error: 'CDP not connected' });
      }

      if (!this.injectionService) {
        return res.status(500).json({ error: 'Injection service not initialized' });
      }

      const result = await this.injectionService.inject(message);

      if (result.ok) {
        res.json({ success: true, method: result.method });
      } else {
        res.status(500).json({ success: false, reason: result.reason });
      }
    });

    // WebSocket connection
    this.wss.on('connection', (ws) => {
      console.log('📱 Client connected');
      ws.on('close', () => {
        console.log('📱 Client disconnected');
      });
    });
  }

  _onSnapshotUpdate(snapshot) {
    this.lastSnapshot = snapshot;
    console.log(`📸 Snapshot updated`);

    // Broadcast to all connected clients
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'snapshot_update',
            timestamp: new Date().toISOString(),
          })
        );
      }
    });
  }

  async start() {
    if (!this.pollingManager) {
      throw new Error('App not initialized. Call initialize() first.');
    }

    this.pollingManager.start();

    return new Promise((resolve) => {
      this.server.listen(this.config.PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://0.0.0.0:${this.config.PORT}`);
        console.log(`📱 Access from mobile: http://<your-ip>:${this.config.PORT}`);
        resolve();
      });
    });
  }

  async stop() {
    // Stop polling if active
    if (this.pollingManager && typeof this.pollingManager.stop === 'function') {
      try {
        this.pollingManager.stop();
      } catch (err) {
        console.error('Error while stopping polling manager:', err);
      }
    }

    // Close CDP client connection if present
    if (this.cdpClient) {
      try {
        if (typeof this.cdpClient.disconnect === 'function') {
          await this.cdpClient.disconnect();
        } else if (typeof this.cdpClient.close === 'function') {
          await this.cdpClient.close();
        }
      } catch (err) {
        console.error('Error while closing CDP client:', err);
      }
    }

    // Close WebSocket connections and server
    if (this.wss) {
      try {
        // Close all connected clients
        this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.close();
            } catch (err) {
              console.error('Error while closing WebSocket client:', err);
            }
          }
        });

        // Close the WebSocket server itself
        await new Promise((resolve) => {
          this.wss.close(() => {
            resolve();
          });
        });
      } catch (err) {
        console.error('Error while closing WebSocket server:', err);
      }
    }

    // Close HTTP server
    if (this.server) {
      try {
        await new Promise((resolve, reject) => {
          this.server.close((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } catch (err) {
        console.error('Error while closing HTTP server:', err);
      }
    }
  }
}
