import { getJson } from '../utils/http.js';

export class CdpDiscoveryService {
  /**
   * @param {number[]} ports - List of ports to check.
   * @param {Function} [getJsonFn] - Optional HTTP getter for testing.
   */
  constructor(ports, getJsonFn = getJson) {
    this.ports = ports;
    this.getJson = getJsonFn;
  }

  /**
   * Finds the VS Code CDP endpoint.
   * @returns {Promise<{port: number, url: string}>}
   * @throws {Error} If CDP not found.
   */
  async findEndpoint() {
    for (const port of this.ports) {
      try {
        const list = await this.getJson(`http://127.0.0.1:${port}/json/list`);
        // Look for workbench specifically
        const found = list.find(
          (t) =>
            t.url?.includes('workbench.html') ||
            (t.title && t.title.includes('workbench')),
        );
        if (found && found.webSocketDebuggerUrl) {
          return { port, url: found.webSocketDebuggerUrl };
        }
      } catch (_e) {
        // Ignore connection errors during discovery
      }
    }
    throw new Error(
      'CDP not found. Is Antigravity started with --remote-debugging-port=9000?',
    );
  }
}
