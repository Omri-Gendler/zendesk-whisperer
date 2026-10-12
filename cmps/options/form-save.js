import { isLoopbackHost, normalizeBaseUrl } from '../copilot/local.js';
import { form, ollamaUrl } from './els.js';
import { saveSettings } from './save.js';
import { showStatus } from './status.js';

export function bindSave() {
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var url = normalizeBaseUrl(ollamaUrl.value);
    if (url && !isLoopbackHost(url)) {
      showStatus('err', 'Ollama URL must be localhost or 127.0.0.1 so ticket text never leaves this computer.');
      return;
    }
    var saveBtn = form.querySelector('[type="submit"]');
    saveBtn.disabled = true;
    try {
      await saveSettings(url);
      showStatus('ok', 'Saved. Generate uses only local models (or on-device rules if no model is ready).');
    } catch (err) {
      showStatus('err', String(err.message || err));
    }
    saveBtn.disabled = false;
  });
}
