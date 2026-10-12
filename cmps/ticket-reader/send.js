function send(message) {
  try {
    var p = chrome.runtime.sendMessage(message);
    if (p && typeof p.catch === 'function') {
      p.catch(function () {});
    }
  } catch (e) {}
}

function fingerprint(ticket) {
  if (!ticket) return 'cleared:' + location.pathname;
  var lastText = '';
  if (ticket.messages.length) {
    var last = ticket.messages[ticket.messages.length - 1];
    if (last && last.text) lastText = last.text.slice(0, 120);
  }
  return JSON.stringify({
    id: ticket.id,
    subject: ticket.subject,
    url: ticket.url.split('?')[0],
    n: ticket.messages.length,
    last: lastText,
    fields: ticket.customFields,
  });
}
