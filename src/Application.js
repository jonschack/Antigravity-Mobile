import http from 'http';
import WebSocket from 'ws';
import { createApp } from './app.js';
import { createWebSocketServer } from './websocket.js';
import { CdpDiscoveryService } from './services/CdpDiscoveryService.js';
import { CdpClient } from './services/CdpClient.js';
import { SnapshotService } from './services/SnapshotService.js';
import { MessageInjectionService } from './services/MessageInjectionService.js';
import { PollingManager } from './services/PollingManager.js';

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
    const { ports, pollInterval, port } = this.config;
    // TODO feature-backend-tailscale-ip-detection: Import os module and detect network interfaces to find 'tailscale0' or 100.x.x.x IPs.

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
    return new Promise((resolve) => {
      // TODO feature-backend-tailscale-bind: Use BIND_IP from config instead of hardcoded '0.0.0.0' to allow binding only to Tailscale interface for security.
      this.server.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://0.0.0.0:${port}`);
        // TODO feature-backend-tailscale-ip-detection: Display the detected Tailscale IP here (e.g. http://100.x.y.z:9000) to make it easier for the user to connect.
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
