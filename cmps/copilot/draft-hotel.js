import { detectComplaint } from './complaint.js';
import { hotelMailHe } from './draft-hotel-he.js';
import { hotelMailEn } from './draft-hotel-en.js';

export function hotelOrSupplierMail(party, ticket, facts, messages, issue, hebrew) {
  var complaint = detectComplaint(messages, issue);
  var guest = facts.guestFullName || facts.guestName || '';
  var order = facts.orderId || ticket.id;
  var hotel = facts.hotel || '';
  if (hebrew) {
    if (!guest) guest = 'האורח';
    return hotelMailHe(party, order, hotel, guest, complaint, issue);
  }
  if (!guest) guest = 'the guest';
  return hotelMailEn(party, order, hotel, guest, complaint, issue);
}
