import { RELOAD_TAB_REASON } from './config.js';
import { CONTENT_SCRIPTS } from './scripts.js';
import { isZendeskUrl } from './tabs-url.js';
import { rememberTab } from './broadcast.js';
import { displayTabState } from './display.js';

export async function requestExtractFromTab(tab) {
  if (!tab || tab.id == null || !isZendeskUrl(tab.url)) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_NOW' });
    return;
  } catch (e) {}
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: CONTENT_SCRIPTS,
    });
    await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_NOW' });
  } catch (e2) {
    rememberTab(tab.id, { reason: RELOAD_TAB_REASON });
    displayTabState(tab.id);
  }
}
