export class APIService {
  static async loadSnapshot() {
    const response = await fetch('/snapshot');
    if (!response.ok) throw new Error('Failed to load snapshot');
    try {
      return await response.json();
    } catch (err) {
      throw new Error('Failed to load snapshot: invalid JSON response');
    }
  }

  static async sendMessage(message) {
    const response = await fetch('/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.reason || 'Unknown error');
    }
  }
}
