export function hotelMailEn(party, order, hotel, guest, complaint, issue) {
  var ask;
  if (party === 'hotel' && issue.id === 'room') {
    ask = 'Please confirm whether a balcony room can be provided, or advise on compensation for the gap.';
  } else {
    ask = 'Please confirm current status (refund / change / decline) so we can update the guest today.';
  }
  var lines = [];
  lines.push('Hello,');
  lines.push('');
  lines.push('We are writing about reservation ' + order + (hotel ? ' at ' + hotel : '') + ' for ' + guest + '.');
  lines.push('The guest reported ' + complaint.en + '.');
  lines.push(ask);
  lines.push('');
  lines.push('Thank you');
  return lines.join('\n');
}
