function extractSubject(ticketId) {
  var pane = ticketPane();
  var els = queryAll(pane, SELECTORS.ticketSubject);
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (!isVisible(el)) continue;
    var raw = el.getAttribute('value') || el.value || el.getAttribute('aria-label') || el.textContent;
    var text = cleanText(raw);
    if (el.getAttribute('aria-label') === 'Subject' && !el.value && !el.textContent) continue;
    if (el.matches && el.matches('input, textarea') && el.getAttribute('aria-label') === 'Subject') {
      text = cleanText(el.value);
    }
    if (!text) continue;
    if (/^subject$/i.test(text)) continue;
    text = stripIdPrefix(text, ticketId);
    if (text) return text;
  }
  var fromTitle = cleanText(document.title).replace(/\s*[|\u2013\u2014\-].*$/, '');
  return stripIdPrefix(fromTitle, ticketId) || '';
}
