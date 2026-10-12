function extractTicketId() {
  var fromPath = location.pathname.match(TICKET_PATH);
  if (fromPath) return fromPath[1];
  var href = location.pathname + location.hash + location.search;
  var fromHref = href.match(TICKET_PATH);
  if (fromHref) return fromHref[1];
  var fromTitle = document.title.match(TICKET_ID_IN_TEXT);
  if (fromTitle) return fromTitle[1];
  return extractTicketIdFromDom();
}

function stripIdPrefix(text, ticketId) {
  var out = text;
  if (ticketId) out = out.replace(new RegExp('^#?' + ticketId + '\\s*[:\\-–—]?\\s*'), '');
  out = out.replace(/^#\d+\s*/, '');
  return cleanText(out);
}
