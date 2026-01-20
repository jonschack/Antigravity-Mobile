import { WebSocketServer } from 'ws';

export function createWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('📱 Client connected');

    ws.on('error', (err) => {
      console.error('📱 WebSocket error:', err);
    });
    ws.on('close', () => {
      console.log('📱 Client disconnected');
    });
  });

  return wss;
}
