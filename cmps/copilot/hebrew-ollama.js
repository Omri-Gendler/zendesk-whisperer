import { isLoopbackHost, normalizeBaseUrl } from './local.js';
import { REWRITE_HE_PROMPT } from './hebrew-prompt.js';
import { cleanRewrittenText } from './hebrew-clean.js';

export async function rewriteWithOllama(text, baseUrl, model) {
  var root = normalizeBaseUrl(baseUrl);
  if (!root || !isLoopbackHost(root)) return { ok: false };
  var modelName = String(model || 'llama3.1').trim();
  if (!modelName) modelName = 'llama3.1';
  try {
    var response = await fetch(root + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: modelName,
        stream: false,
        messages: [
          { role: 'system', content: REWRITE_HE_PROMPT },
          { role: 'user', content: text },
        ],
      }),
    });
    if (!response.ok) return { ok: false };
    var data = await response.json();
    var content = '';
    if (data && data.message && data.message.content) content = data.message.content;
    var next = cleanRewrittenText(content);
    if (!next) return { ok: false };
    return { ok: true, text: next, source: 'ollama' };
  } catch (e) {
    return { ok: false };
  }
}
