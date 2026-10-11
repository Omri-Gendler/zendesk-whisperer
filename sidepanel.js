/* global chrome */
/**
 * Side panel UI. Copy-to-clipboard only — never writes into Zendesk.
 */

import { generateOnDevice } from './local-llm.js';

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
};

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

function internalNoteText(summary) {
  if (!summary) return '';
  const lines = Array.isArray(summary.timeline) ? summary.timeline : [];
  const blocker = summary.blocker || '';
  return [...lines, '', 'Blocker', blocker].join('\n');
}

function textForCopy(id) {
  if (id === 'summary-note') return internalNoteText(state.summary);
  if (id === 'summary-blocker') return (state.summary && state.summary.blocker) || '';
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

  const thinking = (summary.thinking || [])
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join('');
  const thinkingBlock = thinking
    ? `<details class="thinking">
        <summary><span class="thinking__spark" aria-hidden="true">✦</span> Show thinking</summary>
        <ol class="thinking__steps">${thinking}</ol>
      </details>`
    : '';

  const intro = summary.intro
    ? `<p class="ai-intro" dir="auto">${escapeHtml(summary.intro)}</p>`
    : '';

  els.summaryBody.innerHTML = `${thinkingBlock}${intro}`;
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

function render() {
  const hasTicket = Boolean(state.ticket);
  els.generateBtn.disabled = !hasTicket || state.loading;
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
  } else if (state.loading && state.loadingText) {
    showBanner('info', state.loadingText);
  } else {
    showBanner(null);
  }

  renderPreview();
  renderSummary();
  renderDrafts();
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

els.generateBtn.addEventListener('click', onGenerate);

document.addEventListener('click', (event) => {
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
