import { SYSTEM_PROMPT } from './prompt.js';
import { userPrompt } from './compact.js';
import { isLoopbackHost, normalizeBaseUrl } from './local.js';
import { readOllamaResult } from './ollama-read.js';

export async function summarizeWithOllama(ticket, baseUrl, model) {
  var root = normalizeBaseUrl(baseUrl);
  if (!root || !isLoopbackHost(root)) {
    return { ok: false, source: 'ollama', error: 'not_local' };
  }
  var modelName = String(model || 'llama3.1').trim();
  if (!modelName) modelName = 'llama3.1';
  var response;
  try {
    response = await fetch(root + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: modelName,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt(ticket) },
        ],
      }),
    });
  } catch (err) {
    var msg = err && err.message ? err.message : String(err);
    return { ok: false, source: 'ollama', error: 'network', message: msg };
  }
  return readOllamaResult(response);
}
