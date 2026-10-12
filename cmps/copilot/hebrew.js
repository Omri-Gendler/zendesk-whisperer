/**
 * Turn a draft or summary into Hebrew on this computer only.
 */

import {
  hasHebrew,
  mergeTicketNote,
  rewriteDraftToHebrew,
} from './summarizer.js';
import { isLoopbackHost, normalizeBaseUrl } from './local.js';

const REWRITE_HE_PROMPT = `Rewrite this travel-support message into professional Israeli Hebrew.
Keep names, reservation IDs, hotel names, dates, and numbers exactly as written.
Do not add an EL AL or Arbitrip signature.
Return ONLY the rewritten message. No JSON, no quotes, no explanation.`;

let rewriteSession = null;

function cleanRewrittenText(raw) {
  let text = String(raw || '').trim();
  if (!text) return '';
  const fenced = text.match(/```(?:\w+)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();
  if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1).trim();
  return text;
}

function extractJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

async function rewriteWithChromeAi(text, onStatus) {
  if (typeof LanguageModel === 'undefined') return { ok: false };
  try {
    if (!rewriteSession) {
      if (onStatus) onStatus('Starting on-device model…');
      rewriteSession = await LanguageModel.create({
        initialPrompts: [{ role: 'system', content: REWRITE_HE_PROMPT }],
      });
    }
    if (onStatus) onStatus('Translating to Hebrew on this computer…');
    const raw = await rewriteSession.prompt(text);
    const next = cleanRewrittenText(raw);
    if (!next) return { ok: false };
    return { ok: true, text: next, source: 'chrome-ai' };
  } catch {
    rewriteSession = null;
    return { ok: false };
  }
}

async function rewriteWithOllama(text, baseUrl, model) {
  const root = normalizeBaseUrl(baseUrl);
  if (!root || !isLoopbackHost(root)) return { ok: false };
  const modelName = String(model || 'llama3.1').trim() || 'llama3.1';
  try {
    const response = await fetch(`${root}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: modelName,
        stream: false,
        messages: [
          { role: 'system', content: REWRITE_HE_PROMPT },
          { role: 'user', content: text },
        ],
      }),
    });
    if (!response.ok) return { ok: false };
    const data = await response.json();
    const next = cleanRewrittenText(data && data.message && data.message.content);
    if (!next) return { ok: false };
    return { ok: true, text: next, source: 'ollama' };
  } catch {
    return { ok: false };
  }
}

export async function rewriteToHebrew(text, { party, ticket, onStatus } = {}) {
  const src = String(text || '').trim();
  if (!src) return { ok: false, message: 'Nothing to rewrite.' };
  if (hasHebrew(src)) return { ok: true, text: src, source: 'already-he' };

  const settings = await chrome.storage.sync.get({
    useChromeAi: true,
    ollamaUrl: '',
    ollamaModel: 'llama3.1',
  });

  if (settings.useChromeAi !== false) {
    const chromeAi = await rewriteWithChromeAi(src, onStatus);
    if (chromeAi.ok) return chromeAi;
  }

  const ollamaUrl = normalizeBaseUrl(settings.ollamaUrl);
  if (ollamaUrl && isLoopbackHost(ollamaUrl)) {
    if (onStatus) onStatus('Translating with local Ollama…');
    const ollama = await rewriteWithOllama(src, ollamaUrl, settings.ollamaModel);
    if (ollama.ok) return ollama;
  }

  return {
    ok: true,
    text: rewriteDraftToHebrew(src, { party, ticket }),
    source: 'rules',
  };
}

export async function rewriteSummaryToHebrew(summary, { onStatus } = {}) {
  const note = mergeTicketNote(summary && summary.note, null);
  const fields = {
    description: note.description,
    actionsTaken: note.actionsTaken,
    followUp: note.followUp,
  };
  const prompt = `Rewrite these internal-note values into professional Israeli Hebrew.
Keep reservation IDs, supplier names, hotel names, dates, and numbers exactly.
Return ONLY JSON with keys description, actionsTaken, followUp.
${JSON.stringify(fields)}`;

  const rewritten = await rewriteToHebrew(prompt, { onStatus });
  const parsed = rewritten.ok ? extractJson(rewritten.text) : null;
  if (parsed && (parsed.description || parsed.actionsTaken || parsed.followUp)) {
    return {
      ok: true,
      note: {
        orderNumber: note.orderNumber,
        supplierName: note.supplierName,
        description: parsed.description != null ? String(parsed.description) : note.description,
        actionsTaken: parsed.actionsTaken != null ? String(parsed.actionsTaken) : note.actionsTaken,
        followUp: parsed.followUp != null ? String(parsed.followUp) : note.followUp,
      },
      source: rewritten.source,
    };
  }

  return {
    ok: true,
    note: {
      ...note,
      description: rewriteDraftToHebrew(fields.description),
      actionsTaken: rewriteDraftToHebrew(fields.actionsTaken),
      followUp: rewriteDraftToHebrew(fields.followUp),
    },
    source: 'rules',
  };
}
