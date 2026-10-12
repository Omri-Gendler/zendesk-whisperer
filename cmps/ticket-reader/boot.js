function onExtractNow(message, _sender, sendResponse) {
  if (!message || message.type !== 'EXTRACT_NOW') return undefined;
  var ticket = publish(true);
  if (ticket) {
    sendResponse({ ok: true, ticketId: ticket.id });
  } else {
    sendResponse({ ok: false, reason: 'No ticket is selected on this tab.' });
  }
  return undefined;
}

if (window.__arbitripCopilotInjected) {
  schedulePublish();
} else {
  window.__arbitripCopilotInjected = true;
  startObserver();
  hookHistory();
  schedulePublish();
  setTimeout(function () {
    publish(true);
  }, 800);
  setTimeout(startObserver, 1200);
  chrome.runtime.onMessage.addListener(onExtractNow);
}
