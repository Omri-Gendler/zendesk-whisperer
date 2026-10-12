/** Only allow models on this computer. Remote URLs are rejected. */

export function isLoopbackHost(urlString) {
  try {
    const host = new URL(urlString).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
  } catch {
    return false;
  }
}

export function normalizeBaseUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '');
}
