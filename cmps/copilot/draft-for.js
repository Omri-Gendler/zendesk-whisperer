import { formatTicketNote } from './note-fields.js';
import { clientEmail } from './draft-client.js';
import { hotelOrSupplierMail } from './draft-hotel.js';
import { draftHint } from './draft-hint.js';

export function draftFor(party, index, ticket, issue, facts, messages, hebrew, hotelInHebrew, note) {
  var n = index + 1;
  var label = party;
  var text = '';
  if (party === 'client') {
    label = hebrew ? n + '. תגובה ללקוח' : n + '. Response to customer';
    text = clientEmail(ticket, issue, facts, messages, hebrew);
  } else if (party === 'hotel') {
    label = hebrew ? n + '. פנייה למלון' : n + '. Inquiry to the hotel';
    text = hotelOrSupplierMail(party, ticket, facts, messages, issue, hotelInHebrew);
  } else if (party === 'supplier') {
    label = hebrew ? n + '. פנייה לספק' : n + '. Inquiry to the supplier';
    text = hotelOrSupplierMail(party, ticket, facts, messages, issue, hotelInHebrew);
  } else {
    label = hebrew ? n + '. הערה פנימית' : n + '. Internal note';
    text = formatTicketNote(note);
  }
  var hintHebrew = party === 'client' || party === 'internal' ? hebrew : hotelInHebrew;
  return {
    id: 'local-' + party,
    party: party,
    label: label,
    hint: draftHint(party, facts, hintHebrew),
    text: text,
  };
}
