export function clip(text, max) {
  var t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trim() + '…';
}

export function firstSentence(text, max) {
  if (!max) max = 140;
  var t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  var end = t.length;
  var dot = t.indexOf('. ');
  var bang = t.indexOf('! ');
  var q = t.indexOf('? ');
  if (dot !== -1 && dot + 1 < end) end = dot + 1;
  if (bang !== -1 && bang + 1 < end) end = bang + 1;
  if (q !== -1 && q + 1 < end) end = q + 1;
  return clip(t.slice(0, end), max);
}
