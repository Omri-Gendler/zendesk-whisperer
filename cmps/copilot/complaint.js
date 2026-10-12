export function detectComplaint(messages, issue) {
  var blob = '';
  for (var i = 0; i < messages.length; i++) {
    if (messages[i].role === 'client') blob += messages[i].text + '\n';
  }
  if (blob.indexOf('מרפסת') !== -1 || blob.toLowerCase().indexOf('balcony') !== -1) {
    return { he: 'החדר בלי המרפסת שהוזמנה', en: 'the room was provided without the balcony that was booked' };
  }
  if (issue.id === 'points') {
    return { he: 'זיכוי הנקודות', en: 'the points credit' };
  }
  if (issue.id === 'cancellation') {
    return { he: 'ביטול / זיכוי ההזמנה', en: 'a cancellation or refund of the booking' };
  }
  return { he: issue.label, en: issue.label };
}

export function extractStay(blob, fields) {
  if (fields.checkIn && fields.checkOut) {
    return fields.checkIn + '–' + fields.checkOut;
  }
  return fields.checkIn || '';
}
