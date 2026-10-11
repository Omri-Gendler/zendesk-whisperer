import { chromeLanguageModelStatus, isLoopbackHost, normalizeBaseUrl } from './local-llm.js';

const form = document.getElementById('options-form');
const useChromeAi = document.getElementById('use-chrome-ai');
const ollamaUrl = document.getElementById('ollama-url');
const ollamaModel = document.getElementById('ollama-model');
const testBtn = document.getElementById('test-btn');
const statusEl = document.getElementById('status');
const chromeAiStatus = document.getElementById('chrome-ai-status');

function showStatus(kind, text) {
  statusEl.hidden = !text;
  statusEl.className = `status${kind ? ` status--${kind}` : ''}`;
  statusEl.textContent = text || '';
}

async function refreshChromeAiStatus() {
  const result = await chromeLanguageModelStatus();
  const labels = {
    available: 'Ready on this computer.',
    downloadable: 'Available — first Generate will download the model (once).',
    downloading: 'Downloading the on-device model…',
    unavailable: 'Not available on this Chrome / hardware. Ollama or rules will be used instead.',
    unsupported: 'This Chrome has no on-device Prompt API. Use Ollama or the built-in rules.',
  };
  chromeAiStatus.textContent = `Chrome on-device model: ${labels[result.state] || result.message}`;
  chromeAiStatus.className = `model-status${
    result.state === 'available' || result.state === 'downloadable' ? ' model-status--ok' : ''
  }`;
}

async function ensureLoopbackPermission(urlString) {
  const origin = `${new URL(urlString).protocol}//${new URL(urlString).host}/*`;
  const already = await chrome.permissions.contains({ origins: [origin] });
  if (already) return true;
  return chrome.permissions.request({ origins: [origin] });
}

async function saveSettings(url) {
  if (url) {
    const granted = await ensureLoopbackPermission(url);
    if (!granted) {
      throw new Error('Permission to reach local Ollama was not granted.');
    }
  }
  await chrome.storage.sync.set({
    useChromeAi: useChromeAi.checked,
    ollamaUrl: url,
    ollamaModel: String(ollamaModel.value || 'llama3.1').trim() || 'llama3.1',
    backendUrl: '',
  });
  ollamaUrl.value = url;
}

async function load() {
  const stored = await chrome.storage.sync.get({
    useChromeAi: true,
    ollamaUrl: '',
    ollamaModel: 'llama3.1',
  });
  useChromeAi.checked = stored.useChromeAi !== false;
  ollamaUrl.value = stored.ollamaUrl || '';
  ollamaModel.value = stored.ollamaModel || 'llama3.1';
  await refreshChromeAiStatus();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = normalizeBaseUrl(ollamaUrl.value);
  if (url && !isLoopbackHost(url)) {
    showStatus('err', 'Ollama URL must be localhost or 127.0.0.1 so ticket text never leaves this computer.');
    return;
  }

  form.querySelector('[type="submit"]').disabled = true;
  try {
    await saveSettings(url);
    showStatus('ok', 'Saved. Generate uses only local models (or on-device rules if no model is ready).');
  } catch (err) {
    showStatus('err', String(err.message || err));
  } finally {
    form.querySelector('[type="submit"]').disabled = false;
  }
});

testBtn.addEventListener('click', async () => {
  testBtn.disabled = true;
  showStatus(null, 'Testing local models…');
  try {
    const url = normalizeBaseUrl(ollamaUrl.value);
    if (url && !isLoopbackHost(url)) {
      showStatus('err', 'Ollama URL must be localhost or 127.0.0.1.');
      return;
    }
    await saveSettings(url);
    const result = await chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' });
    if (result && result.ok) {
      showStatus('ok', result.message || 'Local model is ready.');
    } else {
      showStatus(
        'err',
        (result && result.message) || 'No neural model is ready. Generate will use on-device rules.'
      );
    }
    await refreshChromeAiStatus();
  } catch (err) {
    showStatus('err', String(err.message || err));
  } finally {
    testBtn.disabled = false;
  }
});

load();
