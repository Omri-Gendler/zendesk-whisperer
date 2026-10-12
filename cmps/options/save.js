import { ollamaModel, ollamaUrl, useChromeAi } from './els.js';
import { refreshChromeAiStatus } from './status.js';

export async function saveSettings(url) {
  if (url) {
    var parsed = new URL(url);
    var origin = parsed.protocol + '//' + parsed.host + '/*';
    var already = await chrome.permissions.contains({ origins: [origin] });
    if (!already) {
      var granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) throw new Error('Permission to reach local Ollama was not granted.');
    }
  }
  var model = String(ollamaModel.value || 'llama3.1').trim();
  if (!model) model = 'llama3.1';
  await chrome.storage.sync.set({
    useChromeAi: useChromeAi.checked,
    ollamaUrl: url,
    ollamaModel: model,
  });
  ollamaUrl.value = url;
}

export async function load() {
  var stored = await chrome.storage.sync.get({
    useChromeAi: true,
    ollamaUrl: '',
    ollamaModel: 'llama3.1',
  });
  useChromeAi.checked = stored.useChromeAi !== false;
  ollamaUrl.value = stored.ollamaUrl || '';
  ollamaModel.value = stored.ollamaModel || 'llama3.1';
  await refreshChromeAiStatus();
}
