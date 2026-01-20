import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApp({ getSnapshot, sendToCdp }) {
  const app = express();

  app.use(express.json());
  app.use(express.static(join(__dirname, '../public')));

  // Get current snapshot
  app.get('/snapshot', (req, res) => {
    const snapshot = getSnapshot();
    if (!snapshot) {
      return res.status(503).json({ error: 'No snapshot available yet' });
    }
    res.json(snapshot);
  });

  // Send message
  app.post('/send', async (req, res) => {
    const { message } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, error: 'Message required' });
    }

    try {
      const result = await sendToCdp(message);

      if (result.ok) {
        res.json({ success: true, method: result.method });
      } else {
        res.status(500).json({
          success: false,
          error: result.reason || result.error || 'Unknown error',
        });
      }
    } catch (err) {
      if (err.message === 'CDP not connected') {
        return res
          .status(503)
          .json({ success: false, error: 'CDP not connected' });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return app;
}
