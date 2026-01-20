/**
 * LatencyIndicator component for displaying network connection quality.
 * Shows the ping/latency to the server in milliseconds with color coding.
 */
export class LatencyIndicator {
  /**
   * @param {string} elementId - The ID of the element to render the indicator
   */
  constructor(elementId) {
    this.element = document.getElementById(elementId);
    this.latency = null;
  }

  /**
   * Updates the latency indicator with a new value.
   * @param {number|null} latencyMs - Latency in milliseconds, or null if disconnected
   */
  update(latencyMs) {
    this.latency = latencyMs;
    this._render();
  }

  /**
   * Determines the quality level based on latency.
   * @param {number} latencyMs - Latency in milliseconds
   * @returns {'good'|'fair'|'poor'} Quality level
   * @private
   */
  _getQuality(latencyMs) {
    if (latencyMs < 100) return 'good';
    if (latencyMs < 300) return 'fair';
    return 'poor';
  }

  /**
   * Renders the latency indicator.
   * @private
   */
  _render() {
    if (!this.element) return;

    if (this.latency === null) {
      this.element.className = 'latency-indicator disconnected';
      this.element.innerHTML = '<span class="latency-dot"></span><span class="latency-text">--</span>';
      this.element.title = 'Disconnected';
    } else {
      const quality = this._getQuality(this.latency);
      this.element.className = `latency-indicator ${quality}`;
      this.element.innerHTML = `<span class="latency-dot"></span><span class="latency-text">${this.latency}ms</span>`;
      this.element.title = `Latency: ${this.latency}ms (${quality})`;
    }
  }
}
