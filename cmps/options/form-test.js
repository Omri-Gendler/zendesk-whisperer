import { isLoopbackHost, normalizeBaseUrl } from '../copilot/local.js';
import { ollamaUrl, testBtn } from './els.js';
import { saveSettings } from './save.js';
import { refreshChromeAiStatus, showStatus } from './status.js';

export function bindTest() {
  testBtn.addEventListener('click', async function () {
    testBtn.disabled = true;
    showStatus('', 'Testing local models…');
    try {
      var url = normalizeBaseUrl(ollamaUrl.value);
      if (url && !isLoopbackHost(url)) {
        showStatus('err', 'Ollama URL must be localhost or 127.0.0.1.');
        testBtn.disabled = false;
        return;
      }
      await saveSettings(url);
      var result = await chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' });
      if (result && result.ok) showStatus('ok', result.message || 'Local model is ready.');
      else showStatus('err', (result && result.message) || 'No neural model is ready. Generate will use on-device rules.');
      await refreshChromeAiStatus();
    } catch (err) {
      showStatus('err', String(err.message || err));
    }
    testBtn.disabled = false;
  });
}
