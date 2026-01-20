import { WebSocketServer } from 'ws';

export function createWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('📱 Client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle ping messages for latency measurement
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (_err) {
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
