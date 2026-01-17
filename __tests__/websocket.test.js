import http from 'http';
import WebSocket from 'ws';
import { createWebSocketServer } from '../src/websocket.js';

describe('WebSocket Layer', () => {
  let server;
  let wss;
  let port;

  beforeAll((done) => {
    server = http.createServer();
    wss = createWebSocketServer(server);
    server.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    wss.close();
    server.close(done);
  });

  it('should accept connection', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.on('open', () => {
      ws.close();
      done();
    });
    ws.on('error', (err) => {
      done(err);
    });
  });
});
