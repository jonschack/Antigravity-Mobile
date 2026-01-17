import WebSocket from 'ws';

export class CdpClient {
  constructor() {
    this.ws = null;
    this.idCounter = 1;
    this.contexts = [];
    this.isConnected = false;
  }

  /**
   * Connects to the CDP via WebSocket.
   * @param {string} url - The WebSocket URL.
   * @returns {Promise<void>}
   */
  async connect(url) {
    this.ws = new WebSocket(url);

    // Setup message handler for context tracking
    this.ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.method === 'Runtime.executionContextCreated') {
          this.contexts.push(data.params.context);
        }
      } catch (_e) {
        // Ignore parse errors from non-JSON messages if any
      }
    });

    await new Promise((resolve, reject) => {
      this.ws.on('open', () => {
        this.isConnected = true;
        resolve();
      });
      this.ws.on('error', reject);
    });

    // Enable runtime to get execution contexts
    await this.call('Runtime.enable', {});
    // Give a small buffer for contexts to populate (legacy behavior preserved)
    await new Promise((r) => setTimeout(r, 1000));
  }

  /**
   * Calls a CDP method.
   * @param {string} method - The method name.
   * @param {object} params - The method parameters.
   * @returns {Promise<any>} - The result.
   */
  call(method, params) {
    if (!this.isConnected || !this.ws) {
      return Promise.reject(new Error('Not connected'));
    }

    return new Promise((resolve, reject) => {
      const id = this.idCounter++;

      const handler = (msg) => {
        try {
          const data = JSON.parse(msg);
          if (data.id === id) {
            this.ws.off('message', handler);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        } catch (_e) {
          // Ignore parse errors for irrelevant messages
        }
      };

      this.ws.on('message', handler);

      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        this.ws.off('message', handler);
        reject(err);
      }
    });
  }

  /**
   * Closes the connection.
   */
  close() {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
    }
  }
}
