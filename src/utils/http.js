import http from 'http';

/**
 * Performs an HTTP GET request and parses the response as JSON.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<any>} - A promise that resolves with the parsed JSON data.
 */
export function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(
          new Error(`Request failed with status code ${res.statusCode}`),
        );
      }

      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
  });
}
