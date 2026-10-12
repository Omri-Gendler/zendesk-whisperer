function getTicketId() {
  const match = location.pathname.match(/\/tickets\/(\d+)/)
  return match ? match[1] : null
}

function getSubject() {
  const input = visibleElements(SUBJECT_SELECTOR)[0]
  if (!input) return document.title
  return cleanText(input.value || input.innerText)
}

function getMessages() {
  const texts = visibleElements(MESSAGE_SELECTOR).map((el) => cleanText(el.innerText).slice(0, 500))
  // The newest messages are at the bottom, so keep the last 30
  return texts.filter((text) => text !== '').slice(-30)
}

function buildTicket() {
  const id = getTicketId()
  if (!id) return null
  return { id: id, subject: getSubject(), messages: getMessages() }
}
