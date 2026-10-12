import { rememberTab } from './broadcast.js';
import { snapshotMessage } from './cache.js';
import { displayTabState } from './display.js';
import { testLocalModels } from '../copilot/generate.js';

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || !message.type) return undefined;
  var tabId = sender.tab && sender.tab.id;
  if (message.type === 'TICKET_EXTRACTED') {
    if (message.ticket) {
      rememberTab(tabId, { ticket: message.ticket });
      displayTabState(tabId).catch(function () {});
    }
    sendResponse({ ok: true });
    return undefined;
  }
  if (message.type === 'TICKET_CLEARED') {
    rememberTab(tabId, { reason: message.reason || "couldn't read this page" });
    displayTabState(tabId).catch(function () {});
    sendResponse({ ok: true });
    return undefined;
  }
  if (message.type === 'GET_LATEST') {
    sendResponse(snapshotMessage());
    return undefined;
  }
  if (message.type === 'TEST_CONNECTION') {
    testLocalModels()
      .then(sendResponse)
      .catch(function (err) {
        sendResponse({ ok: false, error: 'local', message: String(err) });
      });
    return true;
  }
  return undefined;
});
