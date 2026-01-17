export class WebSocketService {
  constructor(url, onMessage, onOpen, onClose) {
    this.url = url;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.ws = null;
    this.initialReconnectInterval = 2000; // Store initial value
    this.reconnectInterval = this.initialReconnectInterval;
    this.maxReconnectInterval = 30000; // Max 30 seconds
    this.backoffMultiplier = 1.5; // Exponential backoff multiplier
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // Reset reconnect state on successful connection
      this.reconnectAttempts = 0;
      this.reconnectInterval = this.initialReconnectInterval;
      if (this.onOpen) this.onOpen();
    };

    this.ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.error('Failed to parse WebSocket message as JSON:', error, event.data);
        return;
      }
      if (this.onMessage) this.onMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (this.onClose) this.onClose();
      
      // Check if we've exceeded max attempts
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max WebSocket reconnection attempts reached');
        return;
      }

      // Exponential backoff with jitter
      const backoffTime = Math.min(
        this.reconnectInterval * Math.pow(this.backoffMultiplier, this.reconnectAttempts),
        this.maxReconnectInterval
      );
      const jitter = Math.random() * 1000; // Add up to 1 second of jitter
      const delay = backoffTime + jitter;

      console.log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), delay);
    };
  }
}
