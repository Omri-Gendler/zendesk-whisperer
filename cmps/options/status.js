import { chromeLanguageModelStatus } from '../copilot/chrome-status.js';
import { chromeAiStatus, statusEl } from './els.js';

export function showStatus(kind, text) {
  if (!text) {
    statusEl.hidden = true;
    statusEl.className = 'status';
    statusEl.textContent = '';
    return;
  }
  statusEl.hidden = false;
  if (kind) statusEl.className = 'status status--' + kind;
  else statusEl.className = 'status';
  statusEl.textContent = text;
}

export async function refreshChromeAiStatus() {
  var result = await chromeLanguageModelStatus();
  var label = result.message;
  if (result.state === 'available') label = 'Ready on this computer.';
  if (result.state === 'downloadable') label = 'Available — first Generate will download the model (once).';
  if (result.state === 'downloading') label = 'Downloading the on-device model…';
  if (result.state === 'unavailable') {
    label = 'Not available on this Chrome / hardware. Ollama or rules will be used instead.';
  }
  if (result.state === 'unsupported') {
    label = 'This Chrome has no on-device Prompt API. Use Ollama or the built-in rules.';
  }
  chromeAiStatus.textContent = 'Chrome on-device model: ' + label;
  if (result.state === 'available' || result.state === 'downloadable') {
    chromeAiStatus.className = 'model-status model-status--ok';
  } else {
    chromeAiStatus.className = 'model-status';
  }
}
