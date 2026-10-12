export function compactTicket(ticket) {
  var fieldList = [];
  var messages = [];
  var i;
  if (ticket.customFields && ticket.customFields.length) {
    for (i = 0; i < ticket.customFields.length && i < 12; i++) {
      fieldList.push(ticket.customFields[i].label + ': ' + ticket.customFields[i].value);
    }
  }
  var allMessages = ticket.messages || [];
  var start = 0;
  if (allMessages.length > 14) start = allMessages.length - 14;
  for (i = start; i < allMessages.length; i++) {
    var m = allMessages[i];
    var text = String(m.text || '').replace(/\s+/g, ' ').trim();
    if (text.length > 700) text = text.slice(0, 700);
    messages.push({
      author: m.author || '',
      visibility: m.visibility || '',
      text: text,
    });
  }
  return {
    id: ticket.id || '',
    subject: ticket.subject || '',
    fields: ticket.customFieldsNormalized || {},
    fieldList: fieldList,
    messages: messages,
  };
}

export function userPrompt(ticket) {
  return 'Ticket JSON to handle. Produce the JSON response now.\n' + JSON.stringify(compactTicket(ticket));
}
