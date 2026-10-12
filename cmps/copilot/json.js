export function extractJson(raw) {
  var text = String(raw || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {}
  var start = text.indexOf('{');
  var end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (e2) {
      return null;
    }
  }
  return null;
}
