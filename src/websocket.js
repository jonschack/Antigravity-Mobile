import { WebSocketServer } from 'ws';

// Maximum message size for WebSocket messages (1KB should be plenty for ping/pong)
const MAX_MESSAGE_SIZE = 1024;

export function createWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('📱 Client connected');

    ws.on('message', (message) => {
      // Reject oversized messages to prevent resource exhaustion
      if (message.length > MAX_MESSAGE_SIZE) {
        console.warn(`📱 Rejected oversized message (${message.length} bytes)`);
        return;
      }
      
      try {
        const data = JSON.parse(message.toString());
        
        // Handle ping messages for latency measurement
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('error', (err) => {
      console.error('📱 WebSocket error:', err);
    });
    ws.on('close', () => {
      console.log('📱 Client disconnected');
    });
  });

  return wss;
}
