function extractTicketIdFromDom() {
  var pane = ticketPane();
  var hints = queryAll(pane, SELECTORS.ticketIdHint);
  for (var i = 0; i < hints.length; i++) {
    var el = hints[i];
    var blob = (el.getAttribute('href') || '') + ' ';
    blob += (el.getAttribute('aria-label') || '') + ' ';
    blob += (el.getAttribute('title') || '') + ' ';
    blob += el.textContent || '';
    var fromPath = blob.match(TICKET_PATH);
    if (fromPath) return fromPath[1];
    var fromHash = blob.match(TICKET_ID_IN_TEXT);
    if (fromHash) return fromHash[1];
  }
  var selectedLink = document.querySelector(
    'a[href*="/tickets/"][aria-current="page"], a[href*="/tickets/"][aria-selected="true"]'
  );
  if (selectedLink) {
    var m = (selectedLink.getAttribute('href') || '').match(TICKET_PATH);
    if (m) return m[1];
  }
  return findTicketIdFromLinks(pane);
}
