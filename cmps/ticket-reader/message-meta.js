function inferAuthor(item) {
  var strong = item.querySelector('strong, b, [data-garden-id*="font"]');
  if (!strong) return null;
  var t = cleanText(strong.innerText);
  if (t && t.length < 80 && !isProbablyChrome(t)) return t;
  return null;
}

function inferVisibility(el) {
  var testId = (el.getAttribute('data-test-id') || '') + ' ' + (el.getAttribute('data-garden-id') || '');
  testId = testId.toLowerCase();
  if (testId.indexOf('internal') !== -1) return 'internal';
  var blob = (el.innerText || '') + ' ' + (el.getAttribute('aria-label') || '');
  var n;
  for (n = 0; n < LABELS.internalNote.length; n++) {
    if (LABELS.internalNote[n].test(blob)) return 'internal';
  }
  for (n = 0; n < LABELS.publicReply.length; n++) {
    if (LABELS.publicReply[n].test(blob)) return 'public';
  }
  if (testId.indexOf('public') !== -1) return 'public';
  return 'unknown';
}

function readTimestamp(timeEl, item) {
  if (timeEl) {
    var dt = timeEl.getAttribute('datetime') || timeEl.dateTime;
    if (dt) return dt;
    var t = cleanText(timeEl.innerText);
    if (t) return t;
  }
  var titled = item.querySelector('[title*=":"], [aria-label*="ago"]');
  if (titled) return cleanText(titled.getAttribute('title') || titled.getAttribute('aria-label') || '');
  return null;
}
