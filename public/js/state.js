export class StateManager {
  constructor() {
    this.state = {
      autoRefreshEnabled: true,
      userIsScrolling: false,
      lastScrollPosition: 0,
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

  setAutoRefresh(enabled) {
    if (this.state.autoRefreshEnabled !== enabled) {
      this.state.autoRefreshEnabled = enabled;
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

    // Re-enable auto refresh after 10s of idle
    this.idleTimer = setTimeout(() => {
      this.setAutoRefresh(true);
    }, 10000);
  }
}
