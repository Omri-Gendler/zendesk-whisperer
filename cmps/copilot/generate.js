import { summarizeTicket } from './summarizer.js'

export const OLLAMA_URL = 'http://127.0.0.1:11434'
export const OLLAMA_BLOCKED = 'Ollama blocked the extension. Run: launchctl setenv OLLAMA_ORIGINS "chrome-extension://*" and restart Ollama.'
export const DEFAULT_SETTINGS = { useChromeAi: true, ollamaModel: 'llama3.1' }

const PROMPT = `You help Arbitrip support agents answer Zendesk tickets.
Reply with JSON only, in exactly this shape:
{
  "note": { "orderNumber": "", "supplierName": "", "description": "", "actionsTaken": "", "followUp": "" },
  "drafts": [{ "label": "Reply to guest", "text": "" }]
}
Add a draft for the hotel or supplier only if they need to do something. Do not add an email signature.
Write to the guest in the language the guest writes in (usually Hebrew). Write to hotels and suppliers in English.
"id" is the Zendesk ticket number, not the order number. Leave a note field empty if the thread does not say it.
Internal notes are written between agents. Never quote them to the guest.`

function ticketToText(ticket) {
  return JSON.stringify({ id: ticket.id, subject: ticket.subject, messages: ticket.messages.slice(-12) })
}

// Models sometimes add text around the JSON, so cut from the first { to the last }
function readReply(raw, source) {
  try {
    const reply = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    const drafts = reply.drafts.filter((draft) => draft.text)
    if (drafts.length === 0) return null
    return { source: source, note: reply.note || {}, drafts: drafts }
  } catch (err) {
    console.error(err)
    return null
  }
}

async function askChromeAi(ticket) {
  if (typeof LanguageModel === 'undefined') return null
  try {
    const session = await LanguageModel.create({ initialPrompts: [{ role: 'system', content: PROMPT }] })
    const raw = await session.prompt(ticketToText(ticket))
    session.destroy()
    return readReply(raw, 'chrome-ai')
  } catch (err) {
    console.error(err)
    return null
  }
}

function ollamaRequest(ticket, model) {
  const body = {
    model: model,
    stream: false,
    format: 'json',
    messages: [
      { role: 'system', content: PROMPT },
      { role: 'user', content: ticketToText(ticket) },
    ],
  }
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

async function askOllama(ticket, model) {
  try {
    const response = await fetch(OLLAMA_URL + '/api/chat', ollamaRequest(ticket, model))
    if (response.status === 403) throw new Error(OLLAMA_BLOCKED)
    if (!response.ok) throw new Error('Ollama answered with HTTP ' + response.status)
    const data = await response.json()
    return readReply(data.message.content, 'ollama')
  } catch (err) {
    console.error(err)
    return null
  }
}

// Try Chrome's built-in AI first, then Ollama, then the simple rules
export async function generateOnDevice(ticket, onStatus) {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS)
  if (settings.useChromeAi) {
    onStatus('Writing with Chrome AI…')
    const chromeReply = await askChromeAi(ticket)
    if (chromeReply) return chromeReply
  }
  onStatus('Writing with Ollama…')
  const ollamaReply = await askOllama(ticket, settings.ollamaModel)
  if (ollamaReply) return ollamaReply
  return summarizeTicket(ticket)
}
