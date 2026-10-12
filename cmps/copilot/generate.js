import { isLoopbackHost, normalizeBaseUrl } from './local.js';
import { summarizeWithChromeAi } from './chrome-ai.js';
import { summarizeWithOllama } from './ollama-chat.js';
import { attachTicketNote } from './attach-note.js';
import { summarizeTicket } from './summarize.js';

export { chromeLanguageModelStatus } from './chrome-status.js';
export { testLocalModels } from './test-models.js';

export async function generateOnDevice(ticket, options) {
  options = options || {};
  var onStatus = options.onStatus;
  var settings = await chrome.storage.sync.get({
    useChromeAi: true,
    ollamaUrl: '',
    ollamaModel: 'llama3.1',
  });
  if (settings.useChromeAi !== false) {
    var chromeAi = await summarizeWithChromeAi(ticket, onStatus);
    if (chromeAi.ok) return attachTicketNote(chromeAi, ticket);
  }
  var ollamaUrl = normalizeBaseUrl(settings.ollamaUrl);
  if (ollamaUrl && isLoopbackHost(ollamaUrl)) {
    if (onStatus) onStatus('Writing with local Ollama…');
    var ollama = await summarizeWithOllama(ticket, ollamaUrl, settings.ollamaModel);
    if (ollama.ok) return attachTicketNote(ollama, ticket);
  }
  if (onStatus) onStatus('Using on-device rules…');
  var rules = summarizeTicket(ticket || {}, false);
  return { ok: true, source: 'rules', summary: rules.summary, drafts: rules.drafts };
}
