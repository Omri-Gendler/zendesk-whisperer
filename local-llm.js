/**
 * Local models only. Ticket text never goes to a public AI host.
 * 1) Chrome on-device Prompt API (Gemini Nano)
 * 2) Ollama on localhost / 127.0.0.1
 * 3) Rules-based summarizer as fallback
 */

import { summarizeTicket } from './local-summarizer.js';

const SYSTEM_PROMPT = `You are a copilot for Arbitrip / EL AL Travel support agents in Zendesk.
The ticket never leaves this device. Do not mention that you are an AI.

Write ready-to-send messages, like Gemini:
- Short intro: "Here are the messages for ticket (ID) of GUEST:" (Hebrew if the thread is Hebrew).
- Numbered drafts by party. Customer-facing Hebrew when the thread is Hebrew. Hotel and supplier emails always in English.
- Empathetic, specific to THIS ticket (hotel, order id, points, balcony, etc.). No event log. No timestamps. No "Omri replied to the customer".
- Do NOT add an EL AL Travel | Arbitrip signature. Zendesk already inserts it. A short "בברכה," + agent first name is OK if the agent name is in the thread.
- Include an internal note draft: short essence + a Blocker line.
- waitingOn must be one of: client, hotel, supplier, internal.

Return ONLY valid JSON with this shape:
{
  "intro": "string",
  "issueType": "string",
  "blocker": "string",
  "waitingOn": "client|hotel|supplier|internal",
  "thinking": ["short reason 1", "short reason 2"],
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

function userPrompt(ticket) {
  return `Ticket JSON to handle. Produce the JSON response now.\n${JSON.stringify(compactTicket(ticket))}`;
}

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

export async function summarizeWithChromeAi(ticket, { onStatus } = {}) {
  try {
    const session = await getChromeSession(onStatus);
    if (!session) return { ok: false, source: 'chrome-ai', error: 'unavailable' };

    if (onStatus) onStatus('Writing with on-device model…');
    const promptText = `${SYSTEM_PROMPT}\n\n${userPrompt(ticket)}`;
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

export async function summarizeWithOllama(ticket, baseUrl, model) {
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
          { role: 'user', content: userPrompt(ticket) },
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

export async function generateOnDevice(ticket, { onStatus } = {}) {
  const settings = await chrome.storage.sync.get({
    useChromeAi: true,
    ollamaUrl: '',
    ollamaModel: 'llama3.1',
  });

  if (settings.useChromeAi !== false) {
    const chromeAi = await summarizeWithChromeAi(ticket, { onStatus });
    if (chromeAi.ok) return chromeAi;
  }

  const ollamaUrl = normalizeBaseUrl(settings.ollamaUrl);
  if (ollamaUrl && isLoopbackHost(ollamaUrl)) {
    if (onStatus) onStatus('Writing with local Ollama…');
    const ollama = await summarizeWithOllama(ticket, ollamaUrl, settings.ollamaModel);
    if (ollama.ok) return ollama;
  }

  if (onStatus) onStatus('Using on-device rules…');
  const rules = summarizeTicket(ticket || {});
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
