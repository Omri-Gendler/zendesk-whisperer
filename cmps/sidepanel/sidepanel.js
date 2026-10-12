import { generateOnDevice } from '../copilot/generate.js'
import { NOTE_FIELDS, formatNote } from '../copilot/summarizer.js'

const statusEl = document.getElementById('status')
const sourceEl = document.getElementById('source')
const generateBtn = document.getElementById('generate-btn')
const outputEl = document.getElementById('output')

const SOURCE_NAMES = { 'chrome-ai': 'Chrome AI', ollama: 'Ollama', rules: 'Simple rules' }

let ticket = null
let reason = ''
let result = null
let busy = false
let statusMessage = ''

// Ticket and model text goes into innerHTML, so escape it first
function escapeHtml(text) {
  return String(text || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function statusText() {
  if (statusMessage) return statusMessage
  if (!ticket) return reason || 'Open a ticket in Zendesk.'
  if (ticket.messages.length === 0) return 'Ticket #' + ticket.id + ': no messages read yet. Wait for the conversation to load.'
  if (result && result.source === 'rules') return 'No AI model answered, so this is the simple fallback. Open Options and click Test Ollama.'
  return 'Ticket #' + ticket.id + ' · ' + ticket.messages.length + ' messages'
}

function noteHtml(note) {
  const rows = NOTE_FIELDS.map((field) => `<p><b>${field.label}:</b> <span dir="auto">${escapeHtml(note[field.key])}</span></p>`)
  return `
    <section class="card">
      <div class="card-head"><h2>סיכום</h2><button data-copy="note">Copy</button></div>
      <div dir="rtl">${rows.join('')}</div>
    </section>`
}

function draftHtml(draft, index) {
  return `
    <section class="card">
      <div class="card-head"><h2>${escapeHtml(draft.label || 'Draft')}</h2><button data-copy="${index}">Copy</button></div>
      <pre dir="auto">${escapeHtml(draft.text)}</pre>
    </section>`
}

function render() {
  statusEl.textContent = statusText()
  sourceEl.textContent = result ? SOURCE_NAMES[result.source] : ''
  generateBtn.disabled = !ticket || busy
  generateBtn.textContent = busy ? 'Working…' : 'Generate'
  if (result) {
    outputEl.innerHTML = noteHtml(result.note) + result.drafts.map(draftHtml).join('')
  } else {
    outputEl.innerHTML = ''
  }
}

async function loadTicket() {
  const stored = await chrome.storage.session.get(['ticket', 'reason'])
  const newTicket = stored.ticket || null
  // A different ticket means the old summary does not apply anymore
  if (!newTicket || !ticket || newTicket.id !== ticket.id) {
    result = null
    statusMessage = ''
  }
  ticket = newTicket
  reason = stored.reason || ''
  render()
}

function showProgress(text) {
  statusMessage = text
  render()
}

async function onGenerate() {
  const ticketId = ticket.id
  busy = true
  showProgress('Starting…')
  try {
    const reply = await generateOnDevice(ticket, showProgress)
    // Ignore the reply if the agent switched tickets while waiting
    if (ticket && ticket.id === ticketId) result = reply
    statusMessage = ''
  } catch (err) {
    console.error(err)
    statusMessage = 'Could not generate: ' + err.message
  }
  busy = false
  render()
}

async function copyText(button) {
  const key = button.dataset.copy
  const text = key === 'note' ? formatNote(result.note) : result.drafts[key].text
  try {
    await navigator.clipboard.writeText(text)
    button.textContent = 'Copied'
  } catch (err) {
    console.error(err)
    button.textContent = 'Copy failed'
  }
  setTimeout(() => { button.textContent = 'Copy' }, 1500)
}

generateBtn.addEventListener('click', onGenerate)

outputEl.addEventListener('click', (event) => {
  if (event.target.dataset.copy) copyText(event.target)
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session') loadTicket()
})

loadTicket()
chrome.runtime.sendMessage({ type: 'PANEL_OPENED' }).catch(console.error)
