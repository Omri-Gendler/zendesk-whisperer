// Zendesk's own test ids for the ticket subject and for each message in the conversation
const SUBJECT_SELECTOR = '[data-test-id="ticket-pane-subject"]'
const MESSAGE_SELECTOR = '[data-test-id="omni-log-comment-item"]'

function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

// Zendesk keeps other open tickets in the page but hides them
function visibleElements(selector) {
  const elements = Array.from(document.querySelectorAll(selector))
  return elements.filter((el) => el.checkVisibility())
}
