/* global chrome */
/**
 * Side panel UI. Copy-to-clipboard only — never writes into Zendesk.
 */

import { generateOnDevice, rewriteSummaryToHebrew, rewriteToHebrew } from './local-llm.js';
import { formatTicketNote, hasHebrew, NOTE_FIELDS } from './local-summarizer.js';

const PORT_NAME = 'sidepanel';
const PARTY_ORDER = ['client', 'hotel', 'supplier', 'internal'];
const PARTY_LABEL = {
  client: 'Client',
  hotel: 'Hotel',
  supplier: 'Supplier',
  internal: 'Internal',
};

const els = {
  banner: document.getElementById('page-banner'),
  preview: document.getElementById('preview'),
  previewHint: document.getElementById('preview-hint'),
  previewBody: document.getElementById('preview-body'),
  generateBtn: document.getElementById('generate-btn'),
  langBar: document.getElementById('lang-bar'),
  summaryBody: document.getElementById('summary-body'),
  draftsBody: document.getElementById('drafts-body'),
  sourceBadge: document.getElementById('source-badge'),
};

const state = {
  ticket: null,
  clearReason: null,
  summary: null,
  drafts: [],
  loading: false,
  loadingText: '',
  error: null,
  copiedId: null,
  source: null,
  hebrewTarget: null,
  hebrewSelected: {
    client: false,
    hotel: false,
    supplier: false,
    summary: false,
  },
};

const HE_SECTIONS = [
  { id: 'client', label: 'לקוח' },
  { id: 'hotel', label: 'מלון' },
  { id: 'supplier', label: 'ספק' },
  { id: 'summary', label: 'סיכום' },
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function copyButton(id) {
  const copied = state.copiedId === id;
  return `<button
    type="button"
    class="btn btn--small ${copied ? 'btn--success' : 'btn--outline'}"
    data-copy-id="${escapeHtml(id)}"
  >${copied ? 'Copied' : 'Copy'}</button>`;
}

function draftsForParty(party) {
  return (state.drafts || []).filter((d) => d.party === party);
}

function sectionHasContent(section) {
  if (section === 'summary') {
    const note = state.summary && state.summary.note;
    return Boolean(note && (note.description || note.actionsTaken || note.followUp || note.orderNumber || note.supplierName));
  }
  return draftsForParty(section).some((d) => d.text);
}

function sectionIsHebrew(section) {
  if (section === 'summary') {
    const note = state.summary && state.summary.note;
    if (!note) return false;
    const parts = [note.description, note.actionsTaken, note.followUp].filter(Boolean);
    return parts.length > 0 && parts.every((part) => hasHebrew(part));
  }
  const drafts = draftsForParty(section).filter((d) => d.text);
  return drafts.length > 0 && drafts.every((d) => hasHebrew(d.text));
}

function sectionCanRestore(section) {
  if (section === 'summary') {
    return Boolean(state.summary && state.summary.originalNote);
  }
  return draftsForParty(section).some((d) => d.originalText && d.text !== d.originalText);
}

function syncInternalDraftFromNote(note) {
  const internal = draftsForParty('internal')[0];
  if (internal && note) internal.text = formatTicketNote(note);
}

function textForCopy(id) {
  if (id === 'summary-note') return formatTicketNote(state.summary && state.summary.note);
  const draft = (state.drafts || []).find((d) => d.id === id);
  return draft ? draft.text || '' : '';
}

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

function applyTicket(ticket) {
  const prevId = state.ticket && state.ticket.id;
  const nextId = ticket && ticket.id;
  if (prevId !== nextId) {
    state.summary = null;
    state.drafts = [];
    state.error = null;
    state.copiedId = null;
    state.loading = false;
    state.loadingText = '';
    state.source = null;
    state.hebrewTarget = null;
    state.hebrewSelected = {
      client: false,
      hotel: false,
      supplier: false,
      summary: false,
    };
  }
  state.ticket = ticket;
  state.clearReason = null;
  render();
}

function applyCleared(reason) {
  state.ticket = null;
  state.summary = null;
  state.drafts = [];
  state.loading = false;
  state.loadingText = '';
  state.error = null;
  state.copiedId = null;
  state.source = null;
  state.hebrewTarget = null;
  state.hebrewSelected = {
    client: false,
    hotel: false,
    supplier: false,
    summary: false,
  };
  state.clearReason = reason || "couldn't read this page";
  render();
}

function showBanner(kind, text) {
  if (!text) {
    els.banner.hidden = true;
    els.banner.textContent = '';
    els.banner.className = 'banner';
    return;
  }
  els.banner.hidden = false;
  els.banner.className = `banner banner--${kind}`;
  els.banner.textContent = text;
}

function renderPreview() {
  const ticket = state.ticket;
  if (!ticket) {
    els.previewHint.textContent = 'Nothing read yet';
    els.previewBody.innerHTML =
      '<p class="muted">Open a Zendesk ticket to see what the AI will receive.</p>';
    return;
  }

  const n = (ticket.messages || []).length;
  els.previewHint.textContent = `#${ticket.id} · ${n} message${n === 1 ? '' : 's'}`;

  const authors = [...new Set((ticket.messages || []).map((m) => m.author).filter(Boolean))];
  const fields = ticket.customFields || [];
  const fieldRows = fields.length
    ? fields
        .map(
          (f) =>
            `<div class="preview__row"><span class="preview__label">${escapeHtml(
              f.label
            )}</span>${escapeHtml(f.value)}</div>`
        )
        .join('')
    : '<p class="muted">No Traider / custom fields matched on this page.</p>';

  const messagePreview = (ticket.messages || [])
    .slice(-5)
    .map((m) => {
      const vis = m.visibility && m.visibility !== 'unknown' ? ` (${m.visibility})` : '';
      const who = m.author || 'Unknown author';
      return `<li>${escapeHtml(who)}${escapeHtml(vis)}</li>`;
    })
    .join('');

  els.previewBody.innerHTML = `
    <div class="preview__row">
      <span class="preview__label">Ticket</span>
      #${escapeHtml(ticket.id)}
    </div>
    <div class="preview__row">
      <span class="preview__label">Subject</span>
      ${escapeHtml(ticket.subject || '(no subject found)')}
    </div>
    <div class="preview__row">
      <span class="preview__label">Thread</span>
      ${n} visible message${n === 1 ? '' : 's'}${
        authors.length ? ` · ${escapeHtml(authors.slice(0, 6).join(', '))}` : ''
      }
      ${messagePreview ? `<ul class="preview__messages">${messagePreview}</ul>` : ''}
    </div>
    ${fieldRows}
  `;
}

function renderSummary() {
  if (state.loading) {
    els.summaryBody.innerHTML =
      '<div class="card__loading">Reading the thread and thinking…</div>';
    return;
  }

  if (state.error) {
    els.summaryBody.innerHTML = `<div class="card__error">${escapeHtml(state.error)}</div>`;
    return;
  }

  const summary = state.summary;
  if (!summary) {
    els.summaryBody.innerHTML =
      '<div class="card__empty">Generate to get ready-to-send messages for this ticket.</div>';
    return;
  }

  const note = summary.note || {};
  const rows = NOTE_FIELDS.map((field) => {
    const value = note[field.key] || '';
    return `
      <div class="ticket-note__row">
        <span class="ticket-note__label">${escapeHtml(field.label)}:</span>
        <span class="ticket-note__value">${escapeHtml(value)}</span>
      </div>`;
  }).join('');

  els.summaryBody.innerHTML = `
    <div class="ticket-note-wrap">
      <div class="suggestion__header">
        <h3 class="draft-title">סיכום</h3>
        ${copyButton('summary-note')}
      </div>
      <div class="ticket-note" dir="rtl">${rows}</div>
    </div>`;
}

function renderDrafts() {
  const drafts = state.drafts || [];
  if (state.loading) {
    els.draftsBody.innerHTML = '';
    return;
  }
  if (!state.summary) {
    els.draftsBody.innerHTML = '';
    return;
  }
  if (!drafts.length) {
    els.draftsBody.innerHTML =
      '<div class="card__empty">No copy-paste drafts for this ticket.</div>';
    return;
  }

  const order = PARTY_ORDER.filter((p) => drafts.some((d) => d.party === p));
  const sorted = order.flatMap((party) => drafts.filter((d) => d.party === party));

  els.draftsBody.innerHTML = sorted
    .map((d) => {
      const hint = d.hint
        ? `<p class="draft-hint" dir="auto">${escapeHtml(d.hint)}</p>`
        : '';
      return `
        <article class="gemini-draft party--${escapeHtml(d.party)}">
          <div class="suggestion__header">
            <h3 class="draft-title">${escapeHtml(d.label || PARTY_LABEL[d.party])}</h3>
            ${copyButton(d.id)}
          </div>
          ${hint}
          <pre class="draft-frame" dir="auto">${escapeHtml(d.text)}</pre>
        </article>
      `;
    })
    .join('');
}

function sourceLabel(source) {
  if (source === 'chrome-ai') return 'On this computer · Nano';
  if (source === 'ollama') return 'On this computer · Ollama';
  if (source === 'rules') return 'On this computer · rules';
  return 'On this computer';
}

function renderLangBar() {
  const bar = els.langBar;
  if (!bar) return;
  bar.hidden = !state.ticket || state.loading;
  if (bar.hidden) return;

  HE_SECTIONS.forEach((section) => {
    const btn = bar.querySelector(`[data-he-section="${section.id}"]`);
    if (!btn) return;
    const busy = state.hebrewTarget === section.id;
    const on = Boolean(state.hebrewSelected[section.id]);
    btn.disabled = Boolean(state.hebrewTarget);
    btn.classList.toggle('is-on', on && !busy);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = busy ? '…' : section.label;
    btn.title = on
      ? `${section.label} מסומן לעברית`
      : `סמן ${section.label} לעברית`;
  });
}

function render() {
  const hasTicket = Boolean(state.ticket);
  const translating = Boolean(state.hebrewTarget);
  els.generateBtn.disabled = !hasTicket || state.loading || translating;
  els.generateBtn.textContent = state.loading
    ? 'Thinking…'
    : state.summary
      ? 'Regenerate'
      : 'Generate';
  if (els.sourceBadge) {
    els.sourceBadge.textContent = sourceLabel(state.source);
  }

  if (!hasTicket) {
    showBanner('error', state.clearReason || "couldn't read this page");
  } else if ((state.loading || translating) && state.loadingText) {
    showBanner('info', state.loadingText);
  } else {
    showBanner(null);
  }

  renderPreview();
  renderSummary();
  renderDrafts();
  renderLangBar();
}

async function onGenerate() {
  if (!state.ticket || state.loading) return;
  state.loading = true;
  state.loadingText = 'Starting local model…';
  state.error = null;
  render();

  let result;
  try {
    result = await generateOnDevice(state.ticket, {
      onStatus(text) {
        state.loadingText = text;
        if (els.banner) {
          els.banner.hidden = false;
          els.banner.className = 'banner banner--info';
          els.banner.textContent = text;
        }
      },
    });
  } catch (err) {
    result = {
      ok: false,
      error: 'local',
      message: String(err && err.message ? err.message : err),
    };
  }

  state.loading = false;
  state.loadingText = '';
  if (!result || !result.ok) {
    state.summary = null;
    state.drafts = [];
    state.source = null;
    state.error = (result && result.message) || 'Could not generate a local summary.';
    render();
    return;
  }

  state.summary = result.summary;
  state.drafts = result.drafts || [];
  state.source = result.source || 'rules';
  state.error = null;
  render();
  await applyMarkedHebrew();
}

async function onCopy(id) {
  const text = textForCopy(id);
  if (!text) return;
  const ok = await writeClipboard(text);
  if (!ok) {
    state.error = 'Could not copy to clipboard.';
    render();
    return;
  }
  state.copiedId = id;
  render();
  setTimeout(() => {
    if (state.copiedId === id) {
      state.copiedId = null;
      render();
    }
  }, 1600);
}

function onStatus(text) {
  state.loadingText = text;
  if (els.banner) {
    els.banner.hidden = false;
    els.banner.className = 'banner banner--info';
    els.banner.textContent = text;
  }
}

function restoreSection(section) {
  if (section === 'summary' && state.summary && state.summary.originalNote) {
    state.summary.note = state.summary.originalNote;
    delete state.summary.originalNote;
    syncInternalDraftFromNote(state.summary.note);
    render();
    return;
  }
  draftsForParty(section).forEach((draft) => {
    if (draft.originalText) draft.text = draft.originalText;
  });
  render();
}

async function convertPartyToHebrew(party) {
  const drafts = draftsForParty(party).filter((d) => d.text && !hasHebrew(d.text));
  for (const draft of drafts) {
    const result = await rewriteToHebrew(draft.text, {
      party: draft.party,
      ticket: state.ticket,
      onStatus,
    });
    if (!result || !result.ok || !result.text) {
      return { ok: false, message: (result && result.message) || 'Could not rewrite this message to Hebrew.' };
    }
    if (!draft.originalText) draft.originalText = draft.text;
    draft.text = result.text;
  }
  return { ok: true };
}

async function convertSummaryToHebrew() {
  const summary = state.summary;
  if (!summary) return { ok: false, message: 'No summary to rewrite.' };
  const result = await rewriteSummaryToHebrew(summary, { onStatus });
  if (!result || !result.ok || !result.note) {
    return { ok: false, message: (result && result.message) || 'Could not rewrite the summary to Hebrew.' };
  }
  if (!summary.originalNote) {
    summary.originalNote = { ...(summary.note || {}) };
  }
  summary.note = result.note;
  syncInternalDraftFromNote(summary.note);
  return { ok: true };
}

async function convertSection(section) {
  if (section === 'summary') return convertSummaryToHebrew();
  return convertPartyToHebrew(section);
}

async function applyMarkedHebrew() {
  for (const section of HE_SECTIONS) {
    if (!state.hebrewSelected[section.id]) continue;
    if (!sectionHasContent(section.id) || sectionIsHebrew(section.id)) continue;
    state.hebrewTarget = section.id;
    state.error = null;
    render();
    let result;
    try {
      result = await convertSection(section.id);
    } catch (err) {
      result = { ok: false, message: String(err && err.message ? err.message : err) };
    }
    state.hebrewTarget = null;
    state.loadingText = '';
    if (!result || !result.ok) {
      state.hebrewSelected[section.id] = false;
      state.error = (result && result.message) || 'Could not rewrite to Hebrew.';
      render();
      return;
    }
  }
  render();
}

async function onHebrewSection(section) {
  if (!section || state.loading || state.hebrewTarget) return;
  const turningOn = !state.hebrewSelected[section];
  state.hebrewSelected[section] = turningOn;
  state.error = null;
  render();

  if (!state.summary) return;

  if (!turningOn) {
    if (sectionCanRestore(section)) restoreSection(section);
    else render();
    return;
  }

  if (!sectionHasContent(section) || sectionIsHebrew(section)) return;

  state.hebrewTarget = section;
  render();
  let result;
  try {
    result = await convertSection(section);
  } catch (err) {
    result = { ok: false, message: String(err && err.message ? err.message : err) };
  }
  state.hebrewTarget = null;
  state.loadingText = '';
  if (!result || !result.ok) {
    state.hebrewSelected[section] = false;
    state.error = (result && result.message) || 'Could not rewrite to Hebrew.';
  }
  render();
}

els.generateBtn.addEventListener('click', onGenerate);

document.addEventListener('click', (event) => {
  const sectionBtn = event.target.closest('[data-he-section]');
  if (sectionBtn && els.langBar && els.langBar.contains(sectionBtn)) {
    onHebrewSection(sectionBtn.getAttribute('data-he-section'));
    return;
  }
  const btn = event.target.closest('[data-copy-id]');
  if (!btn) return;
  if (!els.summaryBody.contains(btn) && !els.draftsBody.contains(btn)) return;
  onCopy(btn.getAttribute('data-copy-id'));
});

function handlePortMessage(message) {
  if (!message) return;
  if (message.type === 'TICKET_UPDATED' && message.ticket) {
    applyTicket(message.ticket);
    return;
  }
  if (message.type === 'TICKET_CLEARED') {
    applyCleared(message.reason);
  }
}

const port = chrome.runtime.connect({ name: PORT_NAME });
port.onMessage.addListener(handlePortMessage);
port.onDisconnect.addListener(() => {
  chrome.runtime.sendMessage({ type: 'GET_LATEST' }).then(handlePortMessage).catch(() => {});
});

chrome.runtime.sendMessage({ type: 'GET_LATEST' }).then(handlePortMessage).catch(() => {
  applyCleared("couldn't read this page");
});

render();
