import { extractHotel, extractChannel } from './extract-hotel.js';
import { extractGuest, extractAgentName } from './extract-people.js';
import { extractStay } from './complaint.js';

export function extractFacts(ticket, messages) {
  var blob = ticket.subject || '';
  var i;
  for (i = 0; i < messages.length; i++) {
    blob += '\n' + (messages[i].author || '') + ' ' + messages[i].text;
  }
  var n = ticket.customFieldsNormalized || {};
  var orderMatch = blob.match(/\b[A-Z0-9]{2,4}-[A-Z0-9]{3,5}\b/);
  var orderId = n.reservationId || '';
  if (orderMatch && !orderId) orderId = orderMatch[0];
  var pointsMatch = blob.match(/([\d,]{2,})\s*(?:points|נקודות)/i);
  var guest = extractGuest(messages);
  var refused = false;
  var lower = blob.toLowerCase();
  if (lower.indexOf('refuse') !== -1 || lower.indexOf('no refund') !== -1 || blob.indexOf('סירב') !== -1) {
    refused = true;
  }
  return {
    orderId: orderId,
    points: pointsMatch ? pointsMatch[1] : '',
    stay: extractStay(blob, n),
    hotel: extractHotel(blob, n, messages),
    channel: extractChannel(blob),
    guestName: guest.first,
    guestFullName: guest.full,
    agentName: extractAgentName(messages),
    refused: refused,
  };
}
