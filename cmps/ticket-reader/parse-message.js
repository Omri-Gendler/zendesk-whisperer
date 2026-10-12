function parseMessage(item) {
  var authorEl = queryFirst(item, SELECTORS.messageAuthor);
  var bodyEl = queryFirst(item, SELECTORS.messageBody);
  var timeEl = queryFirst(item, SELECTORS.messageTimestamp);
  var text = cleanText(bodyEl ? bodyEl.innerText : '');
  if (!text) text = cleanText(item.innerText);
  text = stripChromeFromMessage(text);
  if (!text || text.length < 2) return null;
  if (isProbablyChrome(text)) return null;
  var authorRaw = cleanText(authorEl ? authorEl.innerText : '') || inferAuthor(item) || '';
  var author = cleanAuthorName(authorRaw);
  return {
    author: author || null,
    visibility: inferVisibility(item),
    text: text,
    timestamp: readTimestamp(timeEl, item),
  };
}
