export function cleanRewrittenText(raw) {
  var text = String(raw || '').trim();
  if (!text) return '';
  if (text.charAt(0) === '"' && text.charAt(text.length - 1) === '"') {
    text = text.slice(1, text.length - 1).trim();
  }
  return text;
}
