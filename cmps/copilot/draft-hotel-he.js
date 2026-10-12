export function hotelMailHe(party, order, hotel, guest, complaint, issue) {
  var ask;
  if (party === 'hotel' && issue.id === 'room') {
    ask = 'נשמח לאישור אם ניתן לספק חדר עם מרפסת, או פיצוי על הפער.';
  } else {
    ask = 'נשמח לאישור סטטוס עדכני (זיכוי / שינוי / דחייה) כדי שנוכל לחזור ללקוח היום.';
  }
  var lines = [];
  lines.push('שלום,');
  lines.push('');
  lines.push('פונים לגבי הזמנה ' + order + (hotel ? ' במלון ' + hotel : '') + ' עבור ' + guest + '.');
  lines.push('הלקוח דיווח על ' + complaint.he + '.');
  lines.push(ask);
  lines.push('');
  lines.push('תודה');
  return lines.join('\n');
}
