import { ticketsByTab } from './config.js';
import { isZendeskUrl } from './tabs-url.js';

export async function findRelevantZendeskTab() {
  var focusedList = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  var focused = focusedList[0];
  if (focused && isZendeskUrl(focused.url)) return focused;
  var zendeskTabs = await chrome.tabs.query({ url: 'https://arbitrip-support.zendesk.com/*' });
  for (var i = 0; i < zendeskTabs.length; i++) {
    var entry = ticketsByTab[zendeskTabs[i].id];
    if (entry && entry.ticket) return zendeskTabs[i];
  }
  if (zendeskTabs.length) return zendeskTabs[0];
  return null;
}
