import { ticketsByTab } from './config.js';
import { setSidePanelForTab } from './panel.js';
import { isZendeskUrl } from './tabs-url.js';
import { requestExtractFromTab } from './extract.js';

chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
  if (tab.url) setSidePanelForTab(tabId, tab.url);
  if (info.status === 'complete' && isZendeskUrl(tab.url)) {
    requestExtractFromTab(tab);
  }
});

chrome.tabs.onActivated.addListener(async function (activeInfo) {
  try {
    var tab = await chrome.tabs.get(activeInfo.tabId);
    if (isZendeskUrl(tab.url)) requestExtractFromTab(tab);
  } catch (e) {}
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  delete ticketsByTab[tabId];
});
