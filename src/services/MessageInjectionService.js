import { getInjectionScript } from '../scripts/inject.js';

export class MessageInjectionService {
  /**
   * @param {import('./CdpClient.js').CdpClient} cdpClient
   */
  constructor(cdpClient) {
    this.cdpClient = cdpClient;
  }

  /**
   * Injects a message into the chat.
   * @param {string} text - The message text to inject.
   * @returns {Promise<{ok: boolean, method?: string, reason?: string, error?: string}>}
   */
  async inject(text) {
    if (!this.cdpClient || !this.cdpClient.contexts || this.cdpClient.contexts.length === 0) {
        return { ok: false, reason: 'no_context' };
    }

    const script = getInjectionScript(text);

    for (const ctx of this.cdpClient.contexts) {
      try {
        const result = await this.cdpClient.call('Runtime.evaluate', {
          expression: script,
          returnByValue: true,
          awaitPromise: true,
          contextId: ctx.id,
        });

        if (result.result && result.result.value) {
          return result.result.value;
        }
      } catch (_e) {
        // Continue to next context on failure
      }
    }

    return { ok: false, reason: 'no_context' };
  }
}
