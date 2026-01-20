export class ChatComponent {
  constructor(containerId, contentId, fabId) {
    this.container = document.getElementById(containerId);
    this.content = document.getElementById(contentId);
    this.fab = document.getElementById(fabId);
    this.scrollTimeout = null;
    this.hasRendered = false;

    this.bindEvents();
  }

  bindEvents() {
    this.fab.addEventListener('click', () => {
      this.scrollToBottom();
    });
  }

  onScroll(callback) {
    this.container.addEventListener('scroll', () => {
      this.updateFabVisibility();
      callback();
    });
  }

  updateFabVisibility() {
    const isNearBottom =
      this.container.scrollHeight -
        this.container.scrollTop -
        this.container.clientHeight <
      100;
    this.fab.classList.toggle('show', !isNearBottom);
  }

  render(data) {
    // Save scroll position
    const scrollPos = this.container.scrollTop;
    const isNearBottom =
      this.container.scrollHeight -
        this.container.scrollTop -
        this.container.clientHeight <
      100;

    // Update content
    this.content.innerHTML = `
            <style>
                ${data.css}

                /* Override positioning */
                * {
                    position: static !important;
                }
                #cascade {
                    position: relative !important;
                }

                /* Fix code block backgrounds and text */
                pre, code {
                    background-color: #1e1e1e !important;
                    color: #d4d4d4 !important;
                }

                pre code {
                    background-color: transparent !important;
                }

                /* Fix terminal/console backgrounds */
                [class*="terminal"], [class*="console"], [class*="output"] {
                    background-color: #1e1e1e !important;
                    color: #d4d4d4 !important;
                }

                /* Fix any dark text on dark backgrounds */
                #cascade [style*="background-color: rgb(0, 0, 0)"],
                #cascade [style*="background-color: black"],
                #cascade [style*="background: rgb(0, 0, 0)"],
                #cascade [style*="background: black"] {
                    color: #d4d4d4 !important;
                }

                /* Ensure code syntax highlighting is visible */
                .token, .hljs {
                    color: inherit !important;
                }

                /* Fix any elements with explicit dark backgrounds */
                [style*="background-color:#000"],
                [style*="background-color: #000"],
                [style*="background:#000"],
                [style*="background: #000"] {
                    background-color: #1e1e1e !important;
                }
            </style>
            ${data.html}
        `;

    // Restore scroll position or scroll to bottom
    if (!this.hasRendered || isNearBottom) {
      this.scrollToBottom();
    } else {
      this.container.scrollTop = scrollPos;
    }
    this.hasRendered = true;
  }

  scrollToBottom() {
    this.container.scrollTo({
      top: this.container.scrollHeight,
      behavior: 'smooth',
    });
  }

  setLoading() {
    this.content.innerHTML = '<div class="loading">Loading chat...</div>';
  }

  setError(retryCallbackName) {
    this.content.innerHTML = `<div class="loading">Failed to load chat. <button onclick="${retryCallbackName}()">Retry</button></div>`;
  }
}
