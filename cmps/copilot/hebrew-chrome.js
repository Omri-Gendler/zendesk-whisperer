import { REWRITE_HE_PROMPT } from './hebrew-prompt.js';
import { cleanRewrittenText } from './hebrew-clean.js';

var rewriteSession = null;

export async function rewriteWithChromeAi(text, onStatus) {
  if (typeof LanguageModel === 'undefined') return { ok: false };
  try {
    if (!rewriteSession) {
      if (onStatus) onStatus('Starting on-device model…');
      rewriteSession = await LanguageModel.create({
        initialPrompts: [{ role: 'system', content: REWRITE_HE_PROMPT }],
      });
    }
    if (onStatus) onStatus('Translating to Hebrew on this computer…');
    var raw = await rewriteSession.prompt(text);
    var next = cleanRewrittenText(raw);
    if (!next) return { ok: false };
    return { ok: true, text: next, source: 'chrome-ai' };
  } catch (e) {
    rewriteSession = null;
    return { ok: false };
  }
}
