import { StateManager } from './state.js';
import { APIService } from './services/api.js';
import { WebSocketService } from './services/websocket.js';
import { ChatComponent } from './components/Chat.js';
import { InputComponent } from './components/Input.js';

class App {
  constructor() {
    this.stateManager = new StateManager();

    this.chatComponent = new ChatComponent('chatContainer', 'chatContent', 'scrollToBottom');
    this.inputComponent = new InputComponent('messageInput', 'sendBtn', async (msg) => {
      await APIService.sendMessage(msg);
      // Refresh after short delay, similar to original code
      setTimeout(() => this.loadSnapshot(), 500);
    });

    this.bindEvents();
    this.initWebSocket();
  }

  bindEvents() {
    // Sync scroll state
    this.chatComponent.onScroll(() => {
      this.stateManager.handleUserScroll();
    });

    // Subscribe to state changes if needed
    this.stateManager.subscribe((state) => {
      // Logic for UI updates based on state changes if any specific ones are needed
      // Currently, state mainly controls whether we update or not
    });

    // Expose loadSnapshot globally for retry button (which uses onclick="loadSnapshot()")
    // Since we are module, we need to attach to window
    window.loadSnapshot = () => this.loadSnapshot();
  }

  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.wsService = new WebSocketService(
      wsUrl,
      (data) => this.handleWebSocketMessage(data),
      () => {
        // onOpen
        this.loadSnapshot();
      },
      () => {
        // onClose
      }
    );
    this.wsService.connect();
  }

  handleWebSocketMessage(data) {
    if (
      data.type === 'snapshot_update' &&
      this.stateManager.state.autoRefreshEnabled &&
      !this.stateManager.state.userIsScrolling
    ) {
      this.loadSnapshot();
    }
  }

  async loadSnapshot() {
    try {
      const data = await APIService.loadSnapshot();
      this.chatComponent.render(data);
    } catch (err) {
      console.error('Failed to load snapshot:', err);
      this.chatComponent.setError('loadSnapshot');
    }
  }
}

// Start app
new App();
