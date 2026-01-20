export class APIService {
  static async loadSnapshot() {
    const response = await fetch('/snapshot');
    if (!response.ok) throw new Error('Failed to load snapshot');
    return await response.json();
  }

  static async sendMessage(message) {
    const response = await fetch('/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = await response.json();
        errorMessage = error.error || error.reason || errorMessage;
      } catch (_e) {
        // Ignore parse errors and use default message
      }
      throw new Error(errorMessage);
    }
  }
}
