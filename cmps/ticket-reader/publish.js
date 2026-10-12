function publish(force) {
  var ticket = buildTicket();
  if (!ticket) {
    var fp = 'cleared:' + location.pathname;
    if (!force && fp === lastFingerprint) return null;
    lastFingerprint = fp;
    var reason =
      'No ticket is selected. Open a ticket in the workspace — a views/list URL is not enough unless a ticket pane is open.';
    console.info('[Arbitrip Copilot]', reason, location.pathname);
    send({ type: 'TICKET_CLEARED', reason: reason });
    return null;
  }
  var fp2 = fingerprint(ticket);
  if (!force && fp2 === lastFingerprint) return ticket;
  lastFingerprint = fp2;
  console.info(
    '[Arbitrip Copilot] extracted ticket',
    ticket.id,
    'messages',
    ticket.messages.length,
    'fields',
    ticket.customFields.length
  );
  send({ type: 'TICKET_EXTRACTED', ticket: ticket });
  return ticket;
}
