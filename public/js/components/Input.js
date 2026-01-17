import { ToastComponent } from './Toast.js';

export class InputComponent {
  constructor(inputId, btnId, onSend) {
    this.input = document.getElementById(inputId);
    this.btn = document.getElementById(btnId);
    this.onSend = onSend;
    this.toast = new ToastComponent();

    this.bindEvents();
  }

  bindEvents() {
    this.btn.addEventListener('click', () => this.handleSend());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    this.input.addEventListener('input', () => {
      this.input.style.height = '44px';
      this.input.style.height =
        Math.min(this.input.scrollHeight, 120) + 'px';
    });
  }

  async handleSend() {
    const message = this.input.value.trim();
    if (!message) return;

    this.btn.disabled = true;
    this.btn.textContent = 'Sending...';

    try {
      await this.onSend(message);
      this.input.value = '';
      this.input.style.height = '44px';
    } catch (error) {
      this.toast.show(`Failed to send: ${error.message}`, 'error');
    } finally {
      this.btn.disabled = false;
      this.btn.textContent = 'Send';
    }
  }
}
