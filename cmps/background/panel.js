import { PANEL_PATH } from './config.js';
import { isZendeskUrl } from './tabs-url.js';

export async function setSidePanelForTab(tabId, url) {
  if (tabId == null) return;
  try {
    await chrome.sidePanel.setOptions({
      tabId: tabId,
      path: PANEL_PATH,
      enabled: isZendeskUrl(url),
    });
  } catch (err) {
    console.warn('setOptions failed', err);
  }
}

export async function configureSidePanelBehavior() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (err) {
    console.warn('setPanelBehavior failed', err);
  }
}

export async function enableOnExistingZendeskTabs() {
  var tabs = await chrome.tabs.query({ url: 'https://arbitrip-support.zendesk.com/*' });
  for (var i = 0; i < tabs.length; i++) {
    await setSidePanelForTab(tabs[i].id, tabs[i].url);
  }
}
