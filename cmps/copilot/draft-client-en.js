export function clientEmailEn(issue, facts, complaint, name, hotel, order, stay) {
  var lines = [];
  if (name) lines.push('Hi ' + name + ',');
  else lines.push('Hi,');
  lines.push('');
  if (issue.id === 'room') {
    lines.push('I completely understand the disappointment around ' + complaint.en + '.');
    lines.push('I am checking this immediately with ' + (hotel || 'the hotel') + ', to close the gap between what was booked and what you received.');
    lines.push('');
    lines.push('I will update you as soon as I have an answer.');
  } else if (facts.refused && hotel) {
    lines.push('We contacted ' + hotel + ' about the booking' + order + stay + '. Unfortunately they would not approve a refund or date change.');
    lines.push('');
    lines.push('I would not recommend booking this property again. We can help find an alternative.');
  } else if (hotel) {
    lines.push('I am checking this immediately with ' + hotel + order + stay + '. I will update you as soon as I have an answer.');
  } else {
    lines.push('Thank you for writing — I am on this now' + order + '.');
    lines.push('');
    lines.push('I will update you as soon as I have confirmation.');
  }
  if (facts.agentName) {
    lines.push('');
    lines.push('Regards,');
    lines.push(facts.agentName);
  }
  return lines.join('\n');
}
