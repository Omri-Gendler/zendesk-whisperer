const ZENDESK_URL = 'https://arbitrip-support.zendesk.com/'

// Clicking the extension icon opens the side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)

// The side panel reads the ticket from session storage, so it survives this worker going to sleep
function saveTicket(ticket, reason) {
  chrome.storage.session.set({ ticket: ticket, reason: reason })
}

async function askTabForTicket(tab) {
  if (!tab || !tab.url || !tab.url.startsWith(ZENDESK_URL)) return
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'READ_TICKET' })
  } catch (err) {
    // No content script in this tab, e.g. it was open before the extension was loaded
    console.error(err)
    saveTicket(null, 'Reload this Zendesk tab so the copilot can read it.')
  }
}

async function askActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  askTabForTicket(tabs[0])
}

chrome.tabs.onActivated.addListener(async (info) => {
  const tab = await chrome.tabs.get(info.tabId)
  askTabForTicket(tab)
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only the tab the agent is looking at can change the panel
  if (message.type === 'TICKET' && sender.tab && sender.tab.active) saveTicket(message.ticket, '')
  if (message.type === 'PANEL_OPENED') askActiveTab()
  sendResponse({ ok: true })
})
