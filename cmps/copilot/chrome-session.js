import { SYSTEM_PROMPT } from './prompt.js';

var chromeSession = null;

export function clearChromeSession() {
  chromeSession = null;
}

export async function getChromeSession(onStatus) {
  if (chromeSession) return chromeSession;
  if (typeof LanguageModel === 'undefined') return null;
  var availability = 'unavailable';
  try {
    availability = await LanguageModel.availability();
  } catch (e) {
    return null;
  }
  if (availability === 'unavailable') return null;
  if (onStatus) {
    if (availability === 'available') onStatus('Starting on-device model…');
    else onStatus('Downloading on-device model (once)…');
  }
  var createOptions = {
    monitor: function (m) {
      m.addEventListener('downloadprogress', function (e) {
        var pct = Math.round((Number(e.loaded) || 0) * 100);
        if (onStatus) onStatus('Downloading on-device model… ' + pct + '%');
      });
    },
    initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
  };
  try {
    chromeSession = await LanguageModel.create(createOptions);
  } catch (e2) {
    chromeSession = await LanguageModel.create({ monitor: createOptions.monitor });
  }
  return chromeSession;
}
