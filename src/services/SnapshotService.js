import { CAPTURE_SCRIPT } from '../scripts/capture.js';

export class SnapshotService {
  /**
   * @param {import('./CdpClient.js').CdpClient} cdpClient
   */
  constructor(cdpClient) {
    this.cdpClient = cdpClient;
  }

  /**
   * Captures the snapshot of the chat.
   * @returns {Promise<object|null>} The snapshot data or null if failed.
   */
  async capture() {
    if (!this.cdpClient || !this.cdpClient.contexts) {
      return null;
    }

    for (const ctx of this.cdpClient.contexts) {
      try {
        const result = await this.cdpClient.call('Runtime.evaluate', {
          expression: CAPTURE_SCRIPT,
          returnByValue: true,
          contextId: ctx.id,
        });

        if (result.result && result.result.value) {
          return result.result.value;
        }
      } catch (_e) {
        // Continue to next context on failure
      }
    }

    return null;
  }
}
