import { extractJson } from './json.js';
import { normalizeModelResult } from './model-result.js';

export async function readOllamaResult(response) {
  if (!response.ok) {
    return { ok: false, source: 'ollama', error: 'http', message: 'Ollama HTTP ' + response.status };
  }
  var data;
  try {
    data = await response.json();
  } catch (e) {
    return { ok: false, source: 'ollama', error: 'bad_response' };
  }
  var raw = '';
  if (data && data.message && data.message.content) raw = data.message.content;
  var parsed = extractJson(raw);
  var result = normalizeModelResult(parsed, 'ollama');
  if (!result) return { ok: false, source: 'ollama', error: 'bad_response' };
  return result;
}
