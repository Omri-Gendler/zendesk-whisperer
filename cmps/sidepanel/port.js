import { PORT_NAME } from './state.js';
import { applyTicket } from './ticket-state.js';
import { applyCleared } from './cleared.js';

export function handlePortMessage(message) {
  if (!message) return;
  if (message.type === 'TICKET_UPDATED' && message.ticket) {
    applyTicket(message.ticket);
    return;
  }
  if (message.type === 'TICKET_CLEARED') {
    applyCleared(message.reason);
  }
}

export function connectPort() {
  var port = chrome.runtime.connect({ name: PORT_NAME });
  port.onMessage.addListener(handlePortMessage);
  port.onDisconnect.addListener(function () {
    chrome.runtime.sendMessage({ type: 'GET_LATEST' }).then(handlePortMessage).catch(function () {});
  });
  chrome.runtime.sendMessage({ type: 'GET_LATEST' }).then(handlePortMessage).catch(function () {
    applyCleared("couldn't read this page");
  });
}
