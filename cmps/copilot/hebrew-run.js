import { hasHebrew } from './hebrew-detect.js';
import { rewriteDraftToHebrew } from './rewrite-draft.js';
import { isLoopbackHost, normalizeBaseUrl } from './local.js';
import { rewriteWithChromeAi } from './hebrew-chrome.js';
import { rewriteWithOllama } from './hebrew-ollama.js';

export async function rewriteToHebrew(text, extra) {
  extra = extra || {};
  var src = String(text || '').trim();
  if (!src) return { ok: false, message: 'Nothing to rewrite.' };
  if (hasHebrew(src)) return { ok: true, text: src, source: 'already-he' };
  var settings = await chrome.storage.sync.get({
    useChromeAi: true,
    ollamaUrl: '',
    ollamaModel: 'llama3.1',
  });
  if (settings.useChromeAi !== false) {
    var chromeAi = await rewriteWithChromeAi(src, extra.onStatus);
    if (chromeAi.ok) return chromeAi;
  }
  var ollamaUrl = normalizeBaseUrl(settings.ollamaUrl);
  if (ollamaUrl && isLoopbackHost(ollamaUrl)) {
    if (extra.onStatus) extra.onStatus('Translating with local Ollama…');
    var ollama = await rewriteWithOllama(src, ollamaUrl, settings.ollamaModel);
    if (ollama.ok) return ollama;
  }
  return { ok: true, text: rewriteDraftToHebrew(src, extra.party, extra.ticket), source: 'rules' };
}
