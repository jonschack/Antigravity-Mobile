/**
 * LatencyIndicator component for displaying network connection quality.
 * Shows the ping/latency to the server in milliseconds with color coding.
 */
export class LatencyIndicator {
  /**
   * @param {string} elementId - The ID of the element to render the indicator
   */
  constructor(elementId) {
    this.elementId = elementId;
    this.element = document.getElementById(elementId);
    this.latency = null;

    if (!this.element && typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(
        `LatencyIndicator: element with id "${elementId}" not found at initialization time. ` +
        'Call attach() after the element is added to the DOM.'
      );
    }
  }

  /**
   * Attempts to (re)attach the indicator to a DOM element.
   * Use this if the target element is added to the DOM after construction.
   * @param {string} [elementId] - Optional element ID to attach to; defaults to the original ID.
   */
  attach(elementId) {
    const targetId = elementId || this.elementId;
    if (!targetId) {
      return;
    }

    this.elementId = targetId;
    this.element = document.getElementById(targetId);

    if (!this.element && typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(
        `LatencyIndicator: element with id "${targetId}" not found when calling attach().`
      );
      return;
    }

    this._render();
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
