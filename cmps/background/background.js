/* global chrome */
/**
 * Opens the side panel on Zendesk tabs and relays the ticket
 * the content script read from the page.
 */

import { testLocalModels } from '../copilot/generate.js';

const ZENDESK_HOST = 'arbitrip-support.zendesk.com';
const PORT_NAME = 'sidepanel';
const CONTENT_SCRIPT = 'cmps/ticket-reader/content-script.js';
const PANEL_PATH = 'cmps/sidepanel/sidepanel.html';

let latestTicket = null;
let latestClearReason = null;
let liveUpdate = false;
const sidepanelPorts = new Set();
const ticketsByTab = new Map();

const RELOAD_TAB_REASON =
  'Reload this Zendesk tab so the copilot can attach (needed after you reload the extension).';

function isZendeskUrl(urlString) {
  if (!urlString) return false;
  try {
    return new URL(urlString).hostname === ZENDESK_HOST;
  } catch {
    return false;
  }
}

async function setSidePanelForTab(tabId, url) {
  if (tabId == null) return;
  try {
    await chrome.sidePanel.setOptions({
      tabId,
      path: PANEL_PATH,
      enabled: isZendeskUrl(url),
    });
  } catch (err) {
    console.warn('setOptions failed', err);
  }
}

async function configureSidePanelBehavior() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (err) {
    console.warn('setPanelBehavior failed', err);
  }
}

async function enableOnExistingZendeskTabs() {
  const tabs = await chrome.tabs.query({ url: 'https://arbitrip-support.zendesk.com/*' });
  await Promise.all(tabs.map((tab) => setSidePanelForTab(tab.id, tab.url)));
}

chrome.runtime.onInstalled.addListener(() => {
  configureSidePanelBehavior();
  enableOnExistingZendeskTabs();
});

chrome.runtime.onStartup.addListener(() => {
  configureSidePanelBehavior();
  enableOnExistingZendeskTabs();
  restoreCache();
});

configureSidePanelBehavior();
restoreCache();

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (tab.url) setSidePanelForTab(tabId, tab.url);
  if (info.status === 'complete' && isZendeskUrl(tab.url)) {
    requestExtractFromTab(tab);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (isZendeskUrl(tab.url)) requestExtractFromTab(tab);
  } catch {
    /* tab closed */
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  ticketsByTab.delete(tabId);
});

async function restoreCache() {
  try {
    const stored = await chrome.storage.session.get(['latestTicket', 'latestClearReason']);
    if (liveUpdate) return;
    if (stored.latestTicket) latestTicket = stored.latestTicket;
    if (stored.latestClearReason) latestClearReason = stored.latestClearReason;
  } catch {
    /* session storage may be unavailable */
  }
}

async function persistCache() {
  try {
    await chrome.storage.session.set({ latestTicket, latestClearReason });
  } catch {
    /* ignore */
  }
}

function snapshotMessage() {
  if (latestTicket) return { type: 'TICKET_UPDATED', ticket: latestTicket };
  return {
    type: 'TICKET_CLEARED',
    reason: latestClearReason || "couldn't read this page",
  };
}

function broadcast(message) {
  for (const port of sidepanelPorts) {
    try {
      port.postMessage(message);
    } catch {
      sidepanelPorts.delete(port);
    }
  }
}

function rememberTab(tabId, entry) {
  if (tabId != null) ticketsByTab.set(tabId, entry);
  liveUpdate = true;
}

async function findRelevantZendeskTab() {
  const [focused] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (focused && isZendeskUrl(focused.url)) return focused;
  const zendeskTabs = await chrome.tabs.query({ url: 'https://arbitrip-support.zendesk.com/*' });
  const withTicket = zendeskTabs.find((tab) => ticketsByTab.get(tab.id) && ticketsByTab.get(tab.id).ticket);
  return withTicket || zendeskTabs[0] || null;
}

async function displayTabState(tabId) {
  const relevant = await findRelevantZendeskTab();
  if (!relevant) {
    latestTicket = null;
    latestClearReason = 'Open a Zendesk ticket tab, then reopen this panel.';
    persistCache();
    broadcast({ type: 'TICKET_CLEARED', reason: latestClearReason });
    return;
  }
  if (tabId != null && relevant.id !== tabId) return;

  const entry = ticketsByTab.get(relevant.id);
  if (entry && entry.ticket) {
    latestTicket = entry.ticket;
    latestClearReason = null;
    persistCache();
    broadcast({ type: 'TICKET_UPDATED', ticket: entry.ticket });
    return;
  }

  latestTicket = null;
  latestClearReason = (entry && entry.reason) || "couldn't read this page";
  persistCache();
  broadcast({ type: 'TICKET_CLEARED', reason: latestClearReason });
}

async function requestExtractFromTab(tab) {
  if (!tab || tab.id == null || !isZendeskUrl(tab.url)) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_NOW' });
    return;
  } catch {
    /* content script missing — common after Reload on chrome://extensions */
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [CONTENT_SCRIPT],
    });
    await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_NOW' });
  } catch {
    rememberTab(tab.id, { reason: RELOAD_TAB_REASON });
    displayTabState(tab.id);
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAME) return;
  sidepanelPorts.add(port);
  port.onDisconnect.addListener(() => sidepanelPorts.delete(port));
  port.postMessage(snapshotMessage());
  findRelevantZendeskTab().then((tab) => {
    if (tab) requestExtractFromTab(tab);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return undefined;
  const tabId = sender.tab && sender.tab.id;

  if (message.type === 'TICKET_EXTRACTED') {
    if (message.ticket) {
      rememberTab(tabId, { ticket: message.ticket });
      displayTabState(tabId).catch(() => {});
    }
    sendResponse({ ok: true });
    return undefined;
  }

  if (message.type === 'TICKET_CLEARED') {
    rememberTab(tabId, { reason: message.reason || "couldn't read this page" });
    displayTabState(tabId).catch(() => {});
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
      .catch((err) => sendResponse({ ok: false, error: 'local', message: String(err) }));
    return true;
  }

  return undefined;
});
