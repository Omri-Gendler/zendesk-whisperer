/**
 * Local models only. Ticket text never goes to a public AI host.
 * 1) Chrome on-device Prompt API (Gemini Nano)
 * 2) Ollama on localhost / 127.0.0.1
 * 3) Rules-based summarizer as fallback
 */

import {
  formatTicketNote,
  hasHebrew,
  mergeTicketNote,
  rewriteDraftToHebrew,
  summarizeTicket,
} from './local-summarizer.js';

const SYSTEM_PROMPT = `You are a copilot for Arbitrip / EL AL Travel support agents in Zendesk.
The ticket never leaves this device. Do not mention that you are an AI.

Write ready-to-send messages, like Gemini:
- Numbered drafts by party. Customer-facing Hebrew when the thread is Hebrew. Hotel and supplier emails always in English.
- Empathetic, specific to THIS ticket (hotel, order id, points, balcony, etc.). No event log. No timestamps. No "Omri replied to the customer".
- Do NOT add an EL AL Travel | Arbitrip signature. Zendesk already inserts it. A short "בברכה," + agent first name is OK if the agent name is in the thread.
- waitingOn must be one of: client, hotel, supplier, internal.
- Fill "note" as an internal Zendesk note. Values only. Labels in the UI are always:
  מספר הזמנה, שם הספק, תיאור הפנייה, פעולות שבוצעו, הערות והמשך טיפול.
  Write note values in Hebrew when the thread is Hebrew. Keep order IDs and supplier/hotel names exact.

Return ONLY valid JSON with this shape:
{
  "intro": "string",
  "issueType": "string",
  "blocker": "string",
  "waitingOn": "client|hotel|supplier|internal",
  "thinking": ["short reason 1", "short reason 2"],
  "note": {
    "orderNumber": "string",
    "supplierName": "string",
    "description": "string",
    "actionsTaken": "string",
    "followUp": "string"
  },
  "drafts": [
    { "party": "client|hotel|supplier|internal", "label": "1. …", "hint": "why to send this", "text": "the message" }
  ]
}`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string' },
    issueType: { type: 'string' },
    blocker: { type: 'string' },
    waitingOn: { type: 'string' },
    thinking: { type: 'array', items: { type: 'string' } },
    note: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string' },
        supplierName: { type: 'string' },
        description: { type: 'string' },
        actionsTaken: { type: 'string' },
        followUp: { type: 'string' },
      },
    },
    drafts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          party: { type: 'string' },
          label: { type: 'string' },
          hint: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['party', 'text'],
      },
    },
  },
  required: ['intro', 'drafts'],
};

let chromeSession = null;

export function isLoopbackHost(urlString) {
  try {
    const host = new URL(urlString).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
  } catch {
    return false;
  }
}

export function normalizeBaseUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '');
}

function compactTicket(ticket) {
  const fields = ticket.customFieldsNormalized || {};
  const fieldList = Array.isArray(ticket.customFields)
    ? ticket.customFields.slice(0, 12).map((f) => `${f.label}: ${f.value}`)
    : [];
  const messages = (ticket.messages || []).slice(-14).map((m) => ({
    author: m.author || '',
    visibility: m.visibility || '',
    text: String(m.text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 700),
  }));
  return {
    id: ticket.id || '',
    subject: ticket.subject || '',
    fields,
    fieldList,
    messages,
  };
}

function userPrompt(ticket, { forceHebrew = false } = {}) {
  const lang = forceHebrew
    ? '\nWrite EVERY draft "text" in professional Israeli Hebrew, including hotel and supplier emails. Keep names, reservation IDs, hotel names, and dates exactly.\n'
    : '';
  return `${lang}Ticket JSON to handle. Produce the JSON response now.\n${JSON.stringify(compactTicket(ticket))}`;
}

const REWRITE_HE_PROMPT = `Rewrite this travel-support message into professional Israeli Hebrew.
Keep names, reservation IDs, hotel names, dates, and numbers exactly as written.
Do not add an EL AL or Arbitrip signature.
Return ONLY the rewritten message. No JSON, no quotes, no explanation.`;

let rewriteSession = null;

function extractJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* continue */
    }
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

function normalizeParty(party) {
  const p = String(party || '').toLowerCase();
  if (p === 'client' || p === 'customer' || p === 'guest') return 'client';
  if (p === 'hotel') return 'hotel';
  if (p === 'supplier' || p === 'expedia' || p === 'hotelbeds') return 'supplier';
  if (p === 'internal' || p === 'note') return 'internal';
  return 'internal';
}

function waitingOnValue(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'client' || v === 'hotel' || v === 'supplier' || v === 'internal') return v;
  return 'internal';
}

function normalizeModelResult(parsed, source) {
  if (!parsed || typeof parsed !== 'object') return null;
  const draftsIn = Array.isArray(parsed.drafts) ? parsed.drafts : [];
  const drafts = draftsIn
    .map((d, i) => {
      const party = normalizeParty(d && d.party);
      const text = d && d.text ? String(d.text).trim() : '';
      if (!text) return null;
      return {
        id: `llm-${party}-${i}`,
        party,
        label: (d && d.label) || party,
        hint: (d && d.hint) || '',
        text,
      };
    })
    .filter(Boolean);
  if (!drafts.length) return null;

  const thinking = Array.isArray(parsed.thinking)
    ? parsed.thinking.map((s) => String(s)).filter(Boolean).slice(0, 6)
    : [];

  return {
    ok: true,
    source,
    summary: {
      issueType: parsed.issueType ? String(parsed.issueType) : '',
      intro: parsed.intro ? String(parsed.intro) : '',
      timeline: [],
      blocker: parsed.blocker ? String(parsed.blocker) : '',
      waitingOn: waitingOnValue(parsed.waitingOn),
      urgency: '',
      thinking,
      note: mergeTicketNote(parsed.note, null),
    },
    drafts,
  };
}

export async function chromeLanguageModelStatus() {
  if (typeof LanguageModel === 'undefined') {
    return { state: 'unsupported', message: 'This Chrome build has no on-device Prompt API.' };
  }
  try {
    const state = await LanguageModel.availability();
    return { state, message: String(state) };
  } catch (err) {
    return { state: 'unsupported', message: String(err && err.message ? err.message : err) };
  }
}

async function getChromeSession(onStatus) {
  if (chromeSession) return chromeSession;
  if (typeof LanguageModel === 'undefined') return null;

  let availability = 'unavailable';
  try {
    availability = await LanguageModel.availability();
  } catch {
    return null;
  }
  if (availability === 'unavailable') return null;

  const monitor = {
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => {
        const pct = Math.round((Number(e.loaded) || 0) * 100);
        if (onStatus) onStatus(`Downloading on-device model… ${pct}%`);
      });
    },
  };

  if (onStatus) {
    onStatus(
      availability === 'available' ? 'Starting on-device model…' : 'Downloading on-device model (once)…'
    );
  }

  try {
    chromeSession = await LanguageModel.create({
      ...monitor,
      initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
    });
  } catch {
    chromeSession = await LanguageModel.create(monitor);
  }
  return chromeSession;
}

export async function summarizeWithChromeAi(ticket, { onStatus, forceHebrew = false } = {}) {
  try {
    const session = await getChromeSession(onStatus);
    if (!session) return { ok: false, source: 'chrome-ai', error: 'unavailable' };

    if (onStatus) onStatus('Writing with on-device model…');
    const promptText = `${SYSTEM_PROMPT}\n\n${userPrompt(ticket, { forceHebrew })}`;
    let raw;
    try {
      raw = await session.prompt(promptText, { responseConstraint: RESPONSE_SCHEMA });
    } catch {
      raw = await session.prompt(promptText);
    }
    const parsed = extractJson(raw);
    const result = normalizeModelResult(parsed, 'chrome-ai');
    if (!result) return { ok: false, source: 'chrome-ai', error: 'bad_response' };
    return result;
  } catch (err) {
    chromeSession = null;
    return {
      ok: false,
      source: 'chrome-ai',
      error: 'failed',
      message: String(err && err.message ? err.message : err),
    };
  }
}

export async function summarizeWithOllama(ticket, baseUrl, model, { forceHebrew = false } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  if (!root || !isLoopbackHost(root)) {
    return { ok: false, source: 'ollama', error: 'not_local' };
  }
  const modelName = String(model || 'llama3.1').trim() || 'llama3.1';
  let response;
  try {
    response = await fetch(`${root}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: modelName,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt(ticket, { forceHebrew }) },
        ],
      }),
    });
  } catch (err) {
    return {
      ok: false,
      source: 'ollama',
      error: 'network',
      message: String(err && err.message ? err.message : err),
    };
  }
  if (!response.ok) {
    return { ok: false, source: 'ollama', error: 'http', message: `Ollama HTTP ${response.status}` };
  }
  let data;
  try {
    data = await response.json();
  } catch {
    return { ok: false, source: 'ollama', error: 'bad_response' };
  }
  const raw = data && data.message && data.message.content;
  const parsed = extractJson(raw);
  const result = normalizeModelResult(parsed, 'ollama');
  if (!result) return { ok: false, source: 'ollama', error: 'bad_response' };
  return result;
}

function cleanRewrittenText(raw) {
  let text = String(raw || '').trim();
  if (!text) return '';
  const fenced = text.match(/```(?:\w+)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();
  if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1).trim();
  return text;
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

export async function rewriteSummaryToHebrew(summary, { onStatus } = {}) {
  const note = mergeTicketNote(summary && summary.note, null);
  const fields = {
    description: note.description,
    actionsTaken: note.actionsTaken,
    followUp: note.followUp,
  };
  const blob = JSON.stringify(fields);
  const prompt = `Rewrite these internal-note values into professional Israeli Hebrew.
Keep reservation IDs, supplier names, hotel names, dates, and numbers exactly.
Return ONLY JSON with keys description, actionsTaken, followUp.
${blob}`;

  const settings = await chrome.storage.sync.get({
    useChromeAi: true,
    ollamaUrl: '',
    ollamaModel: 'llama3.1',
  });

  if (settings.useChromeAi !== false) {
    const chromeAi = await rewriteWithChromeAi(prompt, onStatus);
    const parsed = chromeAi.ok ? extractJson(chromeAi.text) : null;
    if (parsed && (parsed.description || parsed.actionsTaken || parsed.followUp)) {
      return { ok: true, note: normalizeNoteRewrite(parsed, note), source: 'chrome-ai' };
    }
  }

  const ollamaUrl = normalizeBaseUrl(settings.ollamaUrl);
  if (ollamaUrl && isLoopbackHost(ollamaUrl)) {
    if (onStatus) onStatus('Translating summary with local Ollama…');
    const ollama = await rewriteWithOllama(prompt, ollamaUrl, settings.ollamaModel);
    const parsed = ollama.ok ? extractJson(ollama.text) : null;
    if (parsed && (parsed.description || parsed.actionsTaken || parsed.followUp)) {
      return { ok: true, note: normalizeNoteRewrite(parsed, note), source: 'ollama' };
    }
  }

  if (onStatus) onStatus('Using on-device Hebrew rewrite…');
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

function normalizeNoteRewrite(parsed, fallback) {
  return {
    orderNumber: fallback.orderNumber,
    supplierName: fallback.supplierName,
    description: parsed.description != null ? String(parsed.description) : fallback.description,
    actionsTaken: parsed.actionsTaken != null ? String(parsed.actionsTaken) : fallback.actionsTaken,
    followUp: parsed.followUp != null ? String(parsed.followUp) : fallback.followUp,
  };
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

  if (onStatus) onStatus('Using on-device Hebrew rewrite…');
  return {
    ok: true,
    text: rewriteDraftToHebrew(src, { party, ticket }),
    source: 'rules',
  };
}

function attachTicketNote(result, ticket, forceHebrew) {
  if (!result || !result.ok) return result;
  const rules = summarizeTicket(ticket || {}, { forceHebrew });
  const note = mergeTicketNote(result.summary && result.summary.note, rules.summary && rules.summary.note);
  result.summary = result.summary || {};
  result.summary.note = note;
  const internal = (result.drafts || []).find((d) => d.party === 'internal');
  if (internal) internal.text = formatTicketNote(note);
  return result;
}

export async function generateOnDevice(ticket, { onStatus, forceHebrew = false } = {}) {
  const settings = await chrome.storage.sync.get({
    useChromeAi: true,
    ollamaUrl: '',
    ollamaModel: 'llama3.1',
  });

  if (settings.useChromeAi !== false) {
    const chromeAi = await summarizeWithChromeAi(ticket, { onStatus, forceHebrew });
    if (chromeAi.ok) return attachTicketNote(chromeAi, ticket, forceHebrew);
  }

  const ollamaUrl = normalizeBaseUrl(settings.ollamaUrl);
  if (ollamaUrl && isLoopbackHost(ollamaUrl)) {
    if (onStatus) onStatus('Writing with local Ollama…');
    const ollama = await summarizeWithOllama(ticket, ollamaUrl, settings.ollamaModel, { forceHebrew });
    if (ollama.ok) return attachTicketNote(ollama, ticket, forceHebrew);
  }

  if (onStatus) onStatus('Using on-device rules…');
  const rules = summarizeTicket(ticket || {}, { forceHebrew });
  return {
    ok: true,
    source: 'rules',
    summary: rules.summary,
    drafts: rules.drafts,
  };
}

export async function testLocalModels() {
  const chromeAi = await chromeLanguageModelStatus();
  const settings = await chrome.storage.sync.get({ ollamaUrl: '', ollamaModel: 'llama3.1' });
  const ollamaUrl = normalizeBaseUrl(settings.ollamaUrl);
  let ollama = { ok: false, message: 'Ollama is not configured.' };
  if (ollamaUrl && !isLoopbackHost(ollamaUrl)) {
    ollama = { ok: false, message: 'Ollama URL must be localhost / 127.0.0.1 — tickets stay on this computer.' };
  } else if (ollamaUrl) {
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        ollama = { ok: false, message: `Ollama HTTP ${response.status}` };
      } else {
        const data = await response.json();
        const names = Array.isArray(data.models) ? data.models.map((m) => m.name).filter(Boolean) : [];
        ollama = {
          ok: true,
          message: names.length
            ? `Ollama is local. Models: ${names.slice(0, 6).join(', ')}`
            : 'Ollama is local, but no models are installed. Run `ollama pull llama3.1`.',
        };
      }
    } catch (err) {
      ollama = {
        ok: false,
        message: `Ollama is not reachable at ${ollamaUrl}. Start it with \`ollama serve\`.`,
        detail: String(err && err.message ? err.message : err),
      };
    }
  }

  const chromeOk = chromeAi.state === 'available' || chromeAi.state === 'downloadable' || chromeAi.state === 'downloading';
  const parts = [
    chromeOk
      ? `Chrome on-device model: ${chromeAi.state}`
      : `Chrome on-device model: ${chromeAi.state}`,
    ollama.message,
  ];
  if (!chromeOk && !ollama.ok) {
    parts.push('Generate will still run with on-device rules. Nothing is sent off this computer.');
  }
  return {
    ok: true,
    message: parts.join(' · '),
    chromeAi,
    ollama,
  };
}
