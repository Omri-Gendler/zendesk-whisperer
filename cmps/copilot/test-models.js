import { chromeLanguageModelStatus } from './chrome-status.js';
import { isLoopbackHost, normalizeBaseUrl } from './local.js';
import { probeOllama } from './test-ollama.js';

export async function testLocalModels() {
  var chromeAi = await chromeLanguageModelStatus();
  var settings = await chrome.storage.sync.get({ ollamaUrl: '', ollamaModel: 'llama3.1' });
  var ollamaUrl = normalizeBaseUrl(settings.ollamaUrl);
  var ollama = await probeOllama(ollamaUrl);
  var chromeOk = false;
  if (chromeAi.state === 'available') chromeOk = true;
  if (chromeAi.state === 'downloadable') chromeOk = true;
  if (chromeAi.state === 'downloading') chromeOk = true;
  var message = 'Chrome on-device model: ' + chromeAi.state + ' · ' + ollama.message;
  if (!chromeOk && !ollama.ok) {
    message = message + ' · Generate will still run with on-device rules. Nothing is sent off this computer.';
  }
  return {
    ok: true,
    message: message,
    chromeAi: chromeAi,
    ollama: { ok: ollama.ok, message: ollama.message },
  };
}
