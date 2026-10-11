/* global chrome */
/**
 * Service worker — relays extracted ticket data to the side panel.
 * Ticket data is relayed to the side panel. Summaries run on this computer
 * (Chrome on-device model, local Ollama, or rules). Nothing is sent to public AI hosts.
 */

import { generateOnDevice, testLocalModels } from './local-llm.js';

const ZENDESK_HOST = 'arbitrip-support.zendesk.com';
const PORT_NAME = 'sidepanel';
const SESSION_TICKET = 'latestTicket';
const SESSION_REASON = 'latestClearReason';

const ERRORS = {
  no_backend_url: {
    error: 'no_backend_url',
    message: 'No backend URL is set. Open Options and save your backend base URL.',
  },
  permission_denied: {
    error: 'permission_denied',
    message: "couldn't reach the backend — host permission was not granted for that URL.",
  },
  network: {
    error: 'network',
    message: "couldn't reach the backend",
  },
  bad_response: {
    error: 'bad_response',
    message: 'The backend returned an unexpected response.',
  },
  public_ai: {
    error: 'public_ai',
    message:
      'This copilot does not send tickets to OpenAI or other public AI APIs. Leave the backend URL empty to summarize on this computer.',
  },
};

let latestTicket = null;
let latestClearReason = null;
let liveUpdate = false;
const sidepanelPorts = new Set();
/** @type {Map<number, { ticket?: object, reason?: string }>} */
const ticketsByTab = new Map();

const RELOAD_TAB_REASON =
  'Reload this Zendesk tab so the copilot can attach (needed after you reload the extension).';

// ---------------------------------------------------------------------------
// Side panel enablement (Zendesk host only)
// ---------------------------------------------------------------------------

async function configureSidePanelBehavior() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (err) {
    console.warn('setPanelBehavior failed', err);
  }
}

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
      path: 'sidepanel.html',
      enabled: isZendeskUrl(url),
    });
  } catch (err) {
    console.warn('setOptions failed', err);
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

// ---------------------------------------------------------------------------
// Ticket cache + side panel port
// ---------------------------------------------------------------------------

async function restoreCache() {
  try {
    const stored = await chrome.storage.session.get([SESSION_TICKET, SESSION_REASON]);
    if (liveUpdate) return;
    if (stored[SESSION_TICKET]) latestTicket = stored[SESSION_TICKET];
    if (stored[SESSION_REASON]) latestClearReason = stored[SESSION_REASON];
  } catch {
    /* session storage may be unavailable in rare contexts */
  }
}

async function persistCache() {
  try {
    await chrome.storage.session.set({
      [SESSION_TICKET]: latestTicket,
      [SESSION_REASON]: latestClearReason,
    });
  } catch {
    /* ignore */
  }
}

function snapshotMessage() {
  if (latestTicket) {
    return { type: 'TICKET_UPDATED', ticket: latestTicket };
  }
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
      files: ['content-script.js'],
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

function cacheExtracted(ticket, tabId) {
  rememberTab(tabId, { ticket });
  displayTabState(tabId).catch(() => {});
}

function cacheCleared(reason, tabId) {
  rememberTab(tabId, { reason: reason || "couldn't read this page" });
  displayTabState(tabId).catch(() => {});
}

async function generateSummary(ticket) {
  try {
    return await generateOnDevice(ticket || {});
  } catch (err) {
    return {
      ok: false,
      ...ERRORS.network,
      message: String(err && err.message ? err.message : err),
    };
  }
}

async function testConnection() {
  return testLocalModels();
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return undefined;
  const tabId = sender.tab && sender.tab.id;

  if (message.type === 'TICKET_EXTRACTED') {
    if (message.ticket) cacheExtracted(message.ticket, tabId);
    sendResponse({ ok: true });
    return undefined;
  }

  if (message.type === 'TICKET_CLEARED') {
    cacheCleared(message.reason, tabId);
    sendResponse({ ok: true });
    return undefined;
  }

  if (message.type === 'GET_LATEST') {
    sendResponse(snapshotMessage());
    return undefined;
  }

  if (message.type === 'GENERATE') {
    generateSummary(message.ticket)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, ...ERRORS.network, detail: String(err) }));
    return true;
  }

  if (message.type === 'TEST_CONNECTION') {
    testConnection()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, ...ERRORS.network, detail: String(err) }));
    return true;
  }

  return undefined;
});
