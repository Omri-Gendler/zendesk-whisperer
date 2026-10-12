import { SYSTEM_PROMPT } from './prompt.js';
import { RESPONSE_SCHEMA } from './schema.js';
import { userPrompt } from './compact.js';
import { extractJson } from './json.js';
import { normalizeModelResult } from './model-result.js';
import { clearChromeSession, getChromeSession } from './chrome-session.js';

export async function summarizeWithChromeAi(ticket, onStatus) {
  try {
    var session = await getChromeSession(onStatus);
    if (!session) return { ok: false, source: 'chrome-ai', error: 'unavailable' };
    if (onStatus) onStatus('Writing with on-device model…');
    var promptText = SYSTEM_PROMPT + '\n\n' + userPrompt(ticket);
    var raw;
    try {
      raw = await session.prompt(promptText, { responseConstraint: RESPONSE_SCHEMA });
    } catch (e) {
      raw = await session.prompt(promptText);
    }
    var parsed = extractJson(raw);
    var result = normalizeModelResult(parsed, 'chrome-ai');
    if (!result) return { ok: false, source: 'chrome-ai', error: 'bad_response' };
    return result;
  } catch (err) {
    clearChromeSession();
    var msg = err && err.message ? err.message : String(err);
    return { ok: false, source: 'chrome-ai', error: 'failed', message: msg };
  }
}
