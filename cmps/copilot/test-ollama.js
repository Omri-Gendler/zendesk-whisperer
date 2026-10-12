import { isLoopbackHost } from './local.js';

export async function probeOllama(ollamaUrl) {
  if (!ollamaUrl) return { ok: false, message: 'Ollama is not configured.' };
  if (!isLoopbackHost(ollamaUrl)) {
    return { ok: false, message: 'Ollama URL must be localhost / 127.0.0.1 — tickets stay on this computer.' };
  }
  try {
    var response = await fetch(ollamaUrl + '/api/tags', { headers: { Accept: 'application/json' } });
    if (!response.ok) return { ok: false, message: 'Ollama HTTP ' + response.status };
    var data = await response.json();
    var names = [];
    if (data.models && data.models.length) {
      for (var i = 0; i < data.models.length && i < 6; i++) {
        if (data.models[i].name) names.push(data.models[i].name);
      }
    }
    if (names.length) return { ok: true, message: 'Ollama is local. Models: ' + names.join(', ') };
    return { ok: true, message: 'Ollama is local, but no models are installed. Run `ollama pull llama3.1`.' };
  } catch (err) {
    return { ok: false, message: 'Ollama is not reachable at ' + ollamaUrl + '. Start it with `ollama serve`.' };
  }
}
