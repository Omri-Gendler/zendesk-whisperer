import { configureSidePanelBehavior, enableOnExistingZendeskTabs } from './panel.js';
import { restoreCache } from './cache.js';

chrome.runtime.onInstalled.addListener(function () {
  configureSidePanelBehavior();
  enableOnExistingZendeskTabs();
});

chrome.runtime.onStartup.addListener(function () {
  configureSidePanelBehavior();
  enableOnExistingZendeskTabs();
  restoreCache();
});
