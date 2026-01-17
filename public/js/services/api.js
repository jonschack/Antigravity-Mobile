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
      const contentType = response.headers.get('content-type') || '';
      let reason = null;

      if (contentType.includes('application/json')) {
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody.reason === 'string') {
            reason = errorBody.reason;
          }
        } catch (e) {
          // Ignore JSON parse errors and fall back to text or generic message
        }
      }

      if (!reason) {
        try {
          const text = await response.text();
          if (text) {
            reason = text;
          }
        } catch (e) {
          // Ignore text read errors and fall back to generic message
        }
      }

      throw new Error(reason || 'Unknown error');
    }
  }
}
