import { detectComplaint } from './complaint.js';
import { clientEmailHe } from './draft-client-he.js';
import { clientEmailEn } from './draft-client-en.js';

export function clientEmail(ticket, issue, facts, messages, hebrew) {
  var name = facts.guestName || '';
  var hotel = facts.hotel;
  var order = '';
  if (facts.orderId) {
    order = hebrew ? ' (הזמנה ' + facts.orderId + ')' : ' (order ' + facts.orderId + ')';
  }
  var stay = '';
  if (facts.stay) {
    stay = hebrew ? ' לתאריכים ' + facts.stay : ' for ' + facts.stay;
  }
  var complaint = detectComplaint(messages, issue);
  if (hebrew) return clientEmailHe(issue, facts, complaint, name, hotel, order, stay);
  return clientEmailEn(issue, facts, complaint, name, hotel, order, stay);
}
