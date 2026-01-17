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
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
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
      setTimeout(() => this.connect(), this.reconnectInterval);
    };
  }
}
