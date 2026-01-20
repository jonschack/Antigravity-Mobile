export class WebSocketService {
  constructor(url, onMessage, onOpen, onClose, onLatencyUpdate) {
    this.url = url;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onLatencyUpdate = onLatencyUpdate;
    this.ws = null;
    
    // Exponential backoff configuration
    this.minReconnectInterval = 1000; // Start at 1s
    this.maxReconnectInterval = 30000; // Cap at 30s
    this.currentReconnectInterval = this.minReconnectInterval;
    
    // Latency tracking
    this.pingInterval = null;
    this.pingIntervalMs = 5000; // Ping every 5 seconds
    this.pendingPing = null;
    this.latency = null;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // Reset backoff on successful connection
      this.currentReconnectInterval = this.minReconnectInterval;
      // Start latency monitoring
      this._startPing();
      if (this.onOpen) this.onOpen();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Handle pong responses for latency measurement
      if (data.type === 'pong' && this.pendingPing) {
        this.latency = Date.now() - this.pendingPing;
        this.pendingPing = null;
        if (this.onLatencyUpdate) this.onLatencyUpdate(this.latency);
        return;
      }
      
      if (this.onMessage) this.onMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Stop latency monitoring
      this._stopPing();
      this.latency = null;
      if (this.onLatencyUpdate) this.onLatencyUpdate(null);
      
      if (this.onClose) this.onClose();
      
      // Schedule reconnect with exponential backoff
      setTimeout(() => this.connect(), this.currentReconnectInterval);
      
      // Increase interval for next time (exponential backoff with cap)
      this.currentReconnectInterval = Math.min(
        this.currentReconnectInterval * 2,
        this.maxReconnectInterval
      );
    };
  }

  /**
   * Starts periodic ping messages for latency measurement.
   * @private
   */
  _startPing() {
    this._stopPing(); // Clear any existing interval
    this.pingInterval = setInterval(() => this._sendPing(), this.pingIntervalMs);
    // Send initial ping immediately
    this._sendPing();
  }

  /**
   * Stops periodic ping messages.
   * @private
   */
  _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.pendingPing = null;
  }

  /**
   * Sends a ping message to measure latency.
   * @private
   */
  _sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Avoid overwriting an in-flight ping; wait for pong before sending another.
      if (this.pendingPing !== null) {
        return;
      }
      this.pendingPing = Date.now();
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  /**
   * Returns the current latency in milliseconds, or null if not available.
   * @returns {number|null}
   */
  getLatency() {
    return this.latency;
  }
}
