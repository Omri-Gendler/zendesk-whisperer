import { buildDescription } from './note-desc.js';
import { buildActionsTaken } from './note-actions.js';

export function buildTicketNote(ticket, messages, issue, facts, hebrew, blocker) {
  return {
    orderNumber: facts.orderId || '',
    supplierName: facts.channel || facts.hotel || '',
    description: buildDescription(issue, facts, messages, hebrew),
    actionsTaken: buildActionsTaken(messages, facts, hebrew),
    followUp: blocker || '',
  };
}

export function partiesForDrafts(issueId, messages, waitingOn, facts) {
  var hasHotel = false;
  var hasSupplier = false;
  for (var i = 0; i < messages.length; i++) {
    if (messages[i].role === 'hotel') hasHotel = true;
    if (messages[i].role === 'supplier') hasSupplier = true;
  }
  var parties = ['client'];
  if (facts.hotel || hasHotel || waitingOn === 'hotel') {
    parties.push('hotel');
  } else if (facts.channel || hasSupplier || waitingOn === 'supplier') {
    parties.push('supplier');
  }
  parties.push('internal');
  return parties;
}
