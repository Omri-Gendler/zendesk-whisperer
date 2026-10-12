let lastSent = ''
let timer = null

function sendTicket(force) {
  const ticket = buildTicket()
  const json = JSON.stringify(ticket)
  // Don't send the same ticket twice in a row
  if (json === lastSent && !force) return
  lastSent = json
  chrome.runtime.sendMessage({ type: 'TICKET', ticket: ticket }).catch(console.error)
}

// Zendesk is a single-page app, so read the ticket again when the page changes
function onPageChange() {
  clearTimeout(timer)
  timer = setTimeout(() => sendTicket(false), 500)
}

new MutationObserver(onPageChange).observe(document.body, { childList: true, subtree: true })
sendTicket(false)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'READ_TICKET') sendTicket(true)
  sendResponse({ ok: true })
})
