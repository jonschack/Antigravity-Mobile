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
    wss.close(() => {
      server.close(done);
    });
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

  it('should respond to ping with pong', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'ping' }));
    });
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message).toEqual({ type: 'pong' });
      ws.close();
      done();
    });
    ws.on('error', (err) => {
      done(err);
    });
  });

  it('should ignore malformed messages', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.on('open', () => {
      // Send malformed JSON - should not crash
      ws.send('not valid json');
      // Give it time to process
      setTimeout(() => {
        ws.close();
        done();
      }, 100);
    });
    ws.on('error', (err) => {
      done(err);
    });
  });
});
