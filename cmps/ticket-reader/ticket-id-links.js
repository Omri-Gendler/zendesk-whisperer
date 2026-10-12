function findTicketIdFromLinks(pane) {
  var counts = {};
  var scope = pane || document;
  var links = scope.querySelectorAll('a[href*="/tickets/"]');
  var i;
  for (i = 0; i < links.length; i++) {
    var m = (links[i].getAttribute('href') || '').match(TICKET_PATH);
    if (m) counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  var idEls = scope.querySelectorAll('[data-ticket-id], [data-entity-id]');
  for (i = 0; i < idEls.length; i++) {
    var id = idEls[i].getAttribute('data-ticket-id') || idEls[i].getAttribute('data-entity-id');
    if (id && /^\d{5,}$/.test(id)) counts[id] = (counts[id] || 0) + 5;
  }
  var best = null;
  var bestN = 0;
  var ids = Object.keys(counts);
  for (i = 0; i < ids.length; i++) {
    if (counts[ids[i]] > bestN) {
      best = ids[i];
      bestN = counts[ids[i]];
    }
  }
  return best;
}
