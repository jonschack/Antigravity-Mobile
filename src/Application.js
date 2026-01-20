import http from 'http';
import WebSocket from 'ws';
import { createApp } from './app.js';
import { createWebSocketServer } from './websocket.js';
import { CdpDiscoveryService } from './services/CdpDiscoveryService.js';
import { CdpClient } from './services/CdpClient.js';
import { SnapshotService } from './services/SnapshotService.js';
import { MessageInjectionService } from './services/MessageInjectionService.js';
import { PollingManager } from './services/PollingManager.js';
import { getPrimaryTailscaleIP } from './utils/network.js';

export class App {
  constructor(config) {
    this.config = config;
    this.cdpClient = null;
    this.server = null;
    this.wss = null;
    this.pollingManager = null;
    this.lastSnapshot = null;
    this.injectionService = null;
  }

  async start() {
    const { ports, pollInterval, port, bindAddress } = this.config;
    
    // Detect Tailscale IP for remote access
    const tailscaleIP = getPrimaryTailscaleIP();

    // 1. Discovery
    const discoveryService = new CdpDiscoveryService(ports);
    console.log('🔍 Discovering VS Code CDP endpoint...');
    const cdpInfo = await discoveryService.findEndpoint();
    console.log(`✅ Found VS Code on port ${cdpInfo.port}`);

    // 2. Connect CDP
    console.log('🔌 Connecting to CDP...');
    this.cdpClient = new CdpClient();
    await this.cdpClient.connect(cdpInfo.url);
    console.log(
      `✅ Connected! Found ${this.cdpClient.contexts.length} execution contexts\n`,
    );

    // 3. Initialize Services
    const snapshotService = new SnapshotService(this.cdpClient);
    this.injectionService = new MessageInjectionService(this.cdpClient);

    // 4. Create Server
    const app = createApp({
      getSnapshot: () => this.lastSnapshot,
      sendToCdp: async (message) => {
        if (!this.cdpClient || !this.cdpClient.isConnected) {
          throw new Error('CDP not connected');
        }
        if (!this.injectionService) {
          throw new Error('Injection service not initialized');
        }
        return await this.injectionService.inject(message);
      },
    });

    this.server = http.createServer(app);
    this.wss = createWebSocketServer(this.server);

    // 5. Start Polling
    this.pollingManager = new PollingManager(
      snapshotService,
      pollInterval,
      (snapshot) => {
        this.lastSnapshot = snapshot;
        console.log('📸 Snapshot updated');

        // Broadcast to all connected clients
        this.wss.clients.forEach((client) => {
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

    this.pollingManager.start();

    // 6. Listen
    const host = bindAddress || '0.0.0.0';
    return new Promise((resolve) => {
      this.server.listen(port, host, () => {
        console.log(`🚀 Server running on http://${host}:${port}`);
        if (tailscaleIP) {
          console.log(`🔗 Tailscale access: http://${tailscaleIP}:${port}`);
        }
        console.log(`📱 Access from mobile: http://<your-ip>:${port}`);
        resolve();
      });
    });
  }

  async stop() {
    console.log('Stopping App...');
    if (this.pollingManager) {
      this.pollingManager.stop();
    }

    if (this.wss) {
      await new Promise((resolve) => {
        this.wss.close(() => {
          console.log('WebSocket server closed');
          resolve();
        });
      });
    }

    if (this.server) {
      await new Promise(resolve => this.server.close(resolve));
      console.log('HTTP server closed');
    }

    if (this.cdpClient) {
      this.cdpClient.close();
      console.log('CDP Client closed');
    }
  }
}
