function isVisible(el) {
  if (!(el instanceof Element)) return false;
  var style = window.getComputedStyle(el);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;
  var rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

function cleanText(value) {
  var t = String(value || '');
  t = t.replace(/\u00a0/g, ' ');
  t = t.replace(/[\u200b-\u200d\ufeff]/g, '');
  t = t.replace(/[ \t]+\n/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/[ \t]{2,}/g, ' ');
  return t.trim();
}

function ticketPane() {
  return queryFirst(document, SELECTORS.ticketPane) || document.body;
}
