export function isLoopbackHost(urlString) {
  try {
    var host = new URL(urlString).hostname.toLowerCase();
    if (host === 'localhost') return true;
    if (host === '127.0.0.1') return true;
    if (host === '[::1]') return true;
    if (host === '::1') return true;
    return false;
  } catch (e) {
    return false;
  }
}

export function normalizeBaseUrl(url) {
  var text = String(url || '').trim();
  while (text.length > 0 && text.charAt(text.length - 1) === '/') {
    text = text.slice(0, text.length - 1);
  }
  return text;
}
