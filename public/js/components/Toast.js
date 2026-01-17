export class ToastComponent {
  constructor() {
    const existingContainer = document.getElementById('toast-container');
    if (existingContainer) {
      this.container = existingContainer;
    } else {
      this.container = this.createContainer();
      document.body.appendChild(this.container);
    }
  }

  createContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    `;
    return container;
  }

  show(message, type = 'error', duration = 3000) {
    // Check if a toast with the same message is already being displayed
    const existingToasts = Array.from(this.container.children);
    const isDuplicate = existingToasts.some(toast => toast.textContent === message);
    
    if (isDuplicate) {
      return; // Don't create duplicate toast
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Add accessibility attributes
    if (type === 'error') {
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'assertive');
    } else {
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
    }
    
    toast.style.cssText = `
      background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#3b82f6'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-size: 14px;
      max-width: 300px;
      word-wrap: break-word;
      pointer-events: auto;
      animation: slideDown 0.3s ease-out;
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }
}

// Add animations to the document (only once)
if (!document.getElementById('toast-animations')) {
  const style = document.createElement('style');
  style.id = 'toast-animations';
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideUp {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-20px);
      }
    }
  `;
  document.head.appendChild(style);
}
