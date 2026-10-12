import { findHotelName } from './hotels.js';

export function extractHotel(blob, fields, messages) {
  if (fields.hotel) return fields.hotel;
  var body = '';
  for (var i = 0; i < messages.length; i++) {
    body += (messages[i].text || '') + '\n';
  }
  var fromBody = findHotelName(body);
  if (fromBody) return fromBody;
  return findHotelName(blob);
}

export function extractChannel(blob) {
  var lower = blob.toLowerCase();
  if (lower.indexOf('expedia') !== -1) return 'Expedia';
  if (lower.indexOf('booking.com') !== -1) return 'Booking.com';
  if (lower.indexOf('agoda') !== -1) return 'Agoda';
  if (lower.indexOf('hotelbeds') !== -1) return 'Hotelbeds';
  return '';
}
