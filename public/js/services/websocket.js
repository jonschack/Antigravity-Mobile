export class WebSocketService {
  constructor(url, onMessage, onOpen, onClose) {
    this.url = url;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.ws = null;
    this.reconnectInterval = 2000;
  }

  connect() {
    // TODO feature-frontend-connection-resilience: Implement exponential backoff strategy for reconnection (start at 1s, cap at 30s) instead of fixed interval.
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      if (this.onOpen) this.onOpen();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (this.onMessage) this.onMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (this.onClose) this.onClose();
      setTimeout(() => this.connect(), this.reconnectInterval);
    };
  }
}
