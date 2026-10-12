export function cleanAuthor(name) {
  var a = String(name || '');
  var dot = a.indexOf('·');
  if (dot !== -1) a = a.slice(0, dot);
  a = a.replace(/\s+Internal$/i, '').trim();
  var parts = a.split(/\s+/);
  if (parts.length >= 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
    a = parts[0];
  }
  return a;
}

export function cleanMessageText(raw) {
  var t = String(raw || '');
  t = t.replace(/\bShow more\b/gi, ' ');
  t = t.replace(/\bShow less\b/gi, ' ');
  t = t.replace(/Best Regards[\s\S]*/i, ' ');
  t = t.replace(/Kind regards[\s\S]*/i, ' ');
  t = t.replace(/בברכה[\s\S]*/i, ' ');
  t = t.replace(/\|\s*EL AL Travel[\s\S]*/i, ' ');
  t = t.replace(/powered by Arbitrip[\s\S]*/i, ' ');
  t = t.replace(/\s{2,}/g, ' ');
  return t.trim();
}

export function isSystemEvent(text) {
  var t = text || '';
  if (t.indexOf('update is required') !== -1) return true;
  if (t.indexOf('has been reopened') !== -1) return true;
  if (t.indexOf('follow-up the customer') !== -1) return true;
  if (t.indexOf('assigned to') !== -1) return true;
  return false;
}
