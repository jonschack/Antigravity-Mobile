export class StateManager {
  constructor() {
    this.state = {
      autoRefreshEnabled: true,
      userIsScrolling: false,
      autoRefreshDisabledByUser: false, // Track if user explicitly disabled it
    };
    this.listeners = [];
    this.scrollTimeout = null;
    this.idleTimer = null;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  setAutoRefresh(enabled, userInitiated = false) {
    if (this.state.autoRefreshEnabled !== enabled) {
      this.state.autoRefreshEnabled = enabled;
      if (userInitiated) {
        this.state.autoRefreshDisabledByUser = !enabled;
      }
      this.notify();
    }
  }

  handleUserScroll() {
    // Logic from original:
    // userIsScrolling = true;
    // clearTimeout(scrollTimeout);
    // clearTimeout(idleTimer);

    if (!this.state.userIsScrolling) {
      this.state.userIsScrolling = true;
      this.notify();
    }

    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    if (this.idleTimer) clearTimeout(this.idleTimer);

    // Resume scrolling flag after 500ms
    this.scrollTimeout = setTimeout(() => {
      this.state.userIsScrolling = false;
      this.notify();
    }, 500);

    // Re-enable auto refresh after 10s of idle, but only if not explicitly disabled by user
    this.idleTimer = setTimeout(() => {
      if (!this.state.autoRefreshDisabledByUser) {
        this.setAutoRefresh(true);
      }
    }, 10000);
  }
}
