import request from 'supertest';
import { jest } from '@jest/globals';
import { createApp } from '../src/app.js';

describe('HTTP Layer', () => {
  let app;
  let mockGetSnapshot;
  let mockSendToCdp;

  beforeEach(() => {
    mockGetSnapshot = jest.fn();
    mockSendToCdp = jest.fn();
    app = createApp({ getSnapshot: mockGetSnapshot, sendToCdp: mockSendToCdp });
  });

  describe('GET /snapshot', () => {
    it('should return 503 if no snapshot available', async () => {
      mockGetSnapshot.mockReturnValue(null);
      const response = await request(app).get('/snapshot');
      expect(response.status).toBe(503);
      expect(response.body).toEqual({ error: 'No snapshot available yet' });
    });

    it('should return snapshot data if available', async () => {
      const snapshot = { html: '<div>test</div>' };
      mockGetSnapshot.mockReturnValue(snapshot);
      const response = await request(app).get('/snapshot');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(snapshot);
    });
  });

  describe('POST /send', () => {
    it('should return 400 if message is missing', async () => {
      const response = await request(app).post('/send').send({});
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Message required' });
    });

    it('should return 503 if CDP not connected (simulated via mock throwing error)', async () => {
      mockSendToCdp.mockRejectedValue(new Error('CDP not connected'));
      const response = await request(app)
        .post('/send')
        .send({ message: 'hello' });
      expect(response.status).toBe(503);
      expect(response.body).toEqual({ error: 'CDP not connected' });
    });

    it('should return success if message sent', async () => {
      mockSendToCdp.mockResolvedValue({ ok: true, method: 'click_submit' });
      const response = await request(app)
        .post('/send')
        .send({ message: 'hello' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, method: 'click_submit' });
    });

    it('should return 500 if injection failed', async () => {
      mockSendToCdp.mockResolvedValue({ ok: false, reason: 'some reason' });
      const response = await request(app)
        .post('/send')
        .send({ message: 'hello' });
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ success: false, reason: 'some reason' });
    });
  });
});
