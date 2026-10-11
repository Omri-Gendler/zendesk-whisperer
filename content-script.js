/* global chrome */
/**
 * Read-only ticket extraction for the Zendesk Agent Workspace.
 * Never calls the Zendesk API. Never writes into the page.
 *
 * Tune SELECTORS / LABELS below when Zendesk markup shifts — extraction
 * logic should not need to change.
 */

// ---------------------------------------------------------------------------
// SELECTORS / LABELS — centralized config (the only place to retune)
// Prefer data-test-id, aria, and visible label text over CSS class names.
// ---------------------------------------------------------------------------

const SELECTORS = {
  ticketPane: [
    '[data-test-id="ticket-pane"]',
    '[data-test-id="workspace"]',
    '[data-test-id="ticket-workspace"]',
    '#ticket-workspace',
    '#main_panes',
  ],
  ticketSubject: [
    '[data-test-id="ticket-pane-subject"]',
    '[data-test-id="omni-header-subject"]',
    '[data-test-id="header-tab-title"]',
    '[data-test-id="ticket-title"]',
    'input[aria-label="Subject"]',
    'textarea[aria-label="Subject"]',
    '[aria-label="Subject"]',
    'h1',
  ],
  conversationRoot: [
    '[data-test-id="omni-log"]',
    '[data-test-id="omni-log-container"]',
    '[data-test-id="omnilog"]',
    '[data-test-id="ticket-conversation"]',
    '[data-test-id="conversation-pane"]',
    '[role="log"]',
  ],
  messageItem: [
    '[data-test-id="omnilog-item"]',
    '[data-test-id="omni-log-item"]',
    '[data-test-id="omnilog-item-comment"]',
    '[data-test-id="omnilog-comment"]',
    '[data-test-id="comment"]',
    'article',
  ],
  messageAuthor: [
    '[data-test-id="omnilog-item-author"]',
    '[data-test-id="author-name"]',
    '[data-test-id="comment-author"]',
    '[data-test-id="actor-name"]',
  ],
  messageBody: [
    '[data-test-id="omnilog-item-message"]',
    '[data-test-id="omnilog-item-content"]',
    '[data-test-id="comment-body"]',
    '[data-test-id="message-body"]',
    '[data-test-id="rich-text"]',
  ],
  messageTimestamp: [
    'time[datetime]',
    'time',
    '[data-test-id="omnilog-item-timestamp"]',
    '[data-test-id="timestamp"]',
  ],
  composer: [
    '[data-test-id="omni-composer"]',
    '[data-test-id="composer"]',
    '[data-test-id="ticket-editor"]',
    '[role="textbox"][contenteditable="true"]',
  ],
  customFieldRoot: [
    '[data-test-id="ticket-fields"]',
    '[data-test-id="ticket-fields-sidebar"]',
    '[data-test-id="properties-panel"]',
    '[data-test-id="ticket-properties"]',
    '[data-test-id="ticket-sidebar"]',
    'aside',
  ],
  ticketIdHint: [
    '[data-test-id="header-tab"][aria-selected="true"]',
    '[data-test-id="header-tab-title"]',
    '[data-test-id="header-tab"]',
    '[data-test-id="ticket-pane-header"]',
    '[data-test-id="omnibox-header"]',
    '[data-test-id="ticket-header"]',
    '[aria-current="page"]',
  ],
};

const LABELS = {
  internalNote: [/internal note/i, /private comment/i, /private note/i],
  publicReply: [/public reply/i, /public comment/i, /public response/i],
  traiderPrefix: /sync from traider\s*:?\s*/i,
  fieldNames: {
    checkIn: /check[-\s]?in/i,
    checkOut: /check[-\s]?out/i,
    reservationId: /reservation(\s*(id|number|#))?/i,
    hotel: /\bhotel\b/i,
    supplier: /\bsupplier\b/i,
    room: /room(\s*type)?/i,
    guest: /guest(\s*name)?/i,
  },
};

const TICKET_PATH = /\/(?:agent\/)?tickets\/(\d+)/;
const TICKET_ID_IN_TEXT = /#(\d{5,})\b/;
const DEBOUNCE_MS = 400;
const MAX_MESSAGES = 200;
const MAX_FIELD_LABEL_LEN = 80;

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function queryFirst(root, selectors) {
  if (!root) return null;
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch {
      /* invalid selector — skip */
    }
  }
  return null;
}

function queryAll(root, selectors) {
  const seen = new Set();
  const out = [];
  if (!root) return out;
  for (const sel of selectors) {
    let list;
    try {
      list = root.querySelectorAll(sel);
    } catch {
      continue;
    }
    for (const el of list) {
      if (!seen.has(el)) {
        seen.add(el);
        out.push(el);
      }
    }
  }
  return out;
}

function isVisible(el) {
  if (!(el instanceof Element)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function isInsideComposer(el) {
  if (!el || !el.closest) return false;
  return SELECTORS.composer.some((sel) => {
    try {
      return Boolean(el.closest(sel));
    } catch {
      return false;
    }
  });
}

function ticketPane() {
  return queryFirst(document, SELECTORS.ticketPane) || document.body;
}

// ---------------------------------------------------------------------------
// Ticket id / subject
// ---------------------------------------------------------------------------

function extractTicketId() {
  const fromPath = location.pathname.match(TICKET_PATH);
  if (fromPath) return fromPath[1];

  const fromHref = `${location.pathname}${location.hash}${location.search}`.match(TICKET_PATH);
  if (fromHref) return fromHref[1];

  const fromTitle = document.title.match(TICKET_ID_IN_TEXT);
  if (fromTitle) return fromTitle[1];

  return extractTicketIdFromDom();
}

function extractTicketIdFromDom() {
  const pane = ticketPane();
  const hints = queryAll(pane, SELECTORS.ticketIdHint);
  for (const el of hints) {
    const blob = [
      el.getAttribute('href'),
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
      el.textContent,
    ]
      .filter(Boolean)
      .join(' ');
    const fromPath = blob.match(TICKET_PATH);
    if (fromPath) return fromPath[1];
    const fromHash = blob.match(TICKET_ID_IN_TEXT);
    if (fromHash) return fromHash[1];
  }

  const selectedLink = document.querySelector(
    'a[href*="/tickets/"][aria-current="page"], a[href*="/tickets/"][aria-selected="true"]'
  );
  if (selectedLink) {
    const m = (selectedLink.getAttribute('href') || '').match(TICKET_PATH);
    if (m) return m[1];
  }

  const counts = new Map();
  const scope = pane || document;
  for (const a of scope.querySelectorAll('a[href*="/tickets/"]')) {
    const m = (a.getAttribute('href') || '').match(TICKET_PATH);
    if (m) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  }
  for (const el of scope.querySelectorAll('[data-ticket-id], [data-entity-id]')) {
    const id = el.getAttribute('data-ticket-id') || el.getAttribute('data-entity-id');
    if (id && /^\d{5,}$/.test(id)) counts.set(id, (counts.get(id) || 0) + 5);
  }
  let best = null;
  let bestN = 0;
  for (const [id, n] of counts) {
    if (n > bestN) {
      best = id;
      bestN = n;
    }
  }
  return best;
}

function extractSubject(ticketId) {
  const pane = ticketPane();
  for (const el of queryAll(pane, SELECTORS.ticketSubject)) {
    if (!isVisible(el)) continue;
    const raw =
      el.getAttribute('value') ||
      el.value ||
      el.getAttribute('aria-label') ||
      el.textContent;
    let text = cleanText(raw);
    if (el.getAttribute('aria-label') === 'Subject' && !el.value && !el.textContent) continue;
    if (el.matches?.('input, textarea') && el.getAttribute('aria-label') === 'Subject') {
      text = cleanText(el.value);
    }
    if (!text) continue;
    if (/^subject$/i.test(text)) continue;
    text = stripIdPrefix(text, ticketId);
    if (text) return text;
  }

  let fromTitle = cleanText(document.title).replace(/\s*[|\u2013\u2014\-].*$/, '');
  fromTitle = stripIdPrefix(fromTitle, ticketId);
  return fromTitle || '';
}

function stripIdPrefix(text, ticketId) {
  let out = text;
  if (ticketId) out = out.replace(new RegExp(`^#?${ticketId}\\s*[:\\-–—]?\\s*`), '');
  out = out.replace(/^#\d+\s*/, '');
  return cleanText(out);
}

// ---------------------------------------------------------------------------
// Conversation thread
// ---------------------------------------------------------------------------

function extractMessages() {
  const pane = ticketPane();
  const root = queryFirst(pane, SELECTORS.conversationRoot) || pane;
  let items = queryAll(root, SELECTORS.messageItem).filter(
    (el) => isVisible(el) && !isInsideComposer(el)
  );

  if (items.length === 0 && root !== pane) {
    items = [...root.children].filter((el) => isVisible(el) && !isInsideComposer(el));
  }

  const messages = [];
  const seen = new Set();

  for (const item of items) {
    const msg = parseMessage(item);
    if (!msg) continue;
    const key = `${msg.author}|${msg.visibility}|${msg.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    messages.push(msg);
    if (messages.length >= MAX_MESSAGES) break;
  }

  return messages;
}

function parseMessage(item) {
  const authorEl = queryFirst(item, SELECTORS.messageAuthor);
  const bodyEl = queryFirst(item, SELECTORS.messageBody);
  const timeEl = queryFirst(item, SELECTORS.messageTimestamp);

  let text = cleanText(bodyEl ? bodyEl.innerText : '');
  if (!text) text = cleanText(item.innerText);
  text = stripChromeFromMessage(text);
  if (!text || text.length < 2) return null;
  if (isProbablyChrome(text)) return null;

  const author = cleanAuthorName(
    cleanText(authorEl ? authorEl.innerText : '') || inferAuthor(item) || ''
  );
  const visibility = inferVisibility(item);
  const timestamp = readTimestamp(timeEl, item);

  return { author: author || null, visibility, text, timestamp };
}

function cleanAuthorName(name) {
  let a = String(name || '')
    .replace(/\s*[·•].*$/, '')
    .replace(/\s+Internal$/i, '')
    .trim();
  const parts = a.split(/\s+/);
  if (parts.length >= 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
    a = parts[0];
  }
  return a;
}

function stripChromeFromMessage(text) {
  let t = String(text || '');
  t = t.replace(/\bShow more\b/gi, ' ');
  t = t.replace(/\bShow less\b/gi, ' ');
  t = t.replace(/^(Public reply|Internal note|Private comment|Email|WhatsApp|Web|Chat|הערה פנימית)\s*/gim, '');
  t = t.replace(/\bTo:\s*[A-Za-z0-9@._+\-\s]{0,60}/g, ' ');
  t = t.replace(/\b(Yesterday|Today|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+\d{1,2}:\d{2}\b/gi, ' ');
  t = t.replace(/\bSep\s+\d{1,2},\s+\d{4},?\s+at\s+\d{1,2}:\d{2}\s*[AP]M\b/gi, ' ');
  t = t.replace(/Best Regards[\s\S]*/i, ' ');
  t = t.replace(/בברכה[\s\S]*/i, ' ');
  t = t.replace(/\|\s*EL AL Travel[\s\S]*/i, ' ');
  t = t.replace(/powered by Arbitrip[\s\S]*/i, ' ');
  t = t.replace(/<[^>\s]+@[^>]+>/g, ' ');
  return cleanText(t);
}

function isProbablyChrome(text) {
  return /^(send|public reply|internal note|add internal note|attach|cc|bcc)$/i.test(text);
}

function inferAuthor(item) {
  const strong = item.querySelector('strong, b, [data-garden-id*="font"]');
  if (strong) {
    const t = cleanText(strong.innerText);
    if (t && t.length < 80 && !isProbablyChrome(t)) return t;
  }
  return null;
}

function inferVisibility(el) {
  const testId = `${el.getAttribute('data-test-id') || ''} ${el.getAttribute('data-garden-id') || ''}`.toLowerCase();
  if (/internal/.test(testId)) return 'internal';
  if (/public|comment/.test(testId) && !/internal/.test(testId)) {
    /* comment items are often public; still check labels */
  }

  const blob = `${el.innerText || ''} ${el.getAttribute('aria-label') || ''}`;
  if (LABELS.internalNote.some((re) => re.test(blob))) return 'internal';
  if (LABELS.publicReply.some((re) => re.test(blob))) return 'public';
  if (/internal/.test(testId)) return 'internal';
  if (/public/.test(testId)) return 'public';
  return 'unknown';
}

function readTimestamp(timeEl, item) {
  if (timeEl) {
    const dt = timeEl.getAttribute('datetime') || timeEl.dateTime;
    if (dt) return dt;
    const t = cleanText(timeEl.innerText);
    if (t) return t;
  }
  const titled = item.querySelector('[title*=":"], [aria-label*="ago"]');
  if (titled) {
    return cleanText(titled.getAttribute('title') || titled.getAttribute('aria-label') || '');
  }
  return null;
}

// ---------------------------------------------------------------------------
// Traider / custom fields — label text first, not CSS classes
// ---------------------------------------------------------------------------

function extractCustomFields() {
  const pane = ticketPane();
  const roots = queryAll(document, SELECTORS.customFieldRoot);

  const fields = [];
  const seen = new Set();

  function pushField(label, value) {
    const lab = cleanText(label);
    const val = cleanText(value);
    if (!lab || !val || lab === val) return;
    if (lab.length > MAX_FIELD_LABEL_LEN) return;
    const key = `${lab.toLowerCase()}|${val}`;
    if (seen.has(key)) return;
    seen.add(key);
    fields.push({ label: lab, value: val });
  }

  // Known field names (check-in, reservation, …) only inside the properties sidebar.
  // Scanning the whole ticket pane would pick up the word "hotel" from the thread.
  const sidebarRoots = roots.length ? roots : [];
  for (const root of sidebarRoots) {
    collectDtDd(root, pushField, { knownFields: true });
    collectLabeledRows(root, pushField, { knownFields: true });
  }

  // "Sync from Traider: …" labels are matched by visible text anywhere in the ticket pane.
  if (pane) {
    collectDtDd(pane, pushField, { knownFields: false });
    collectLabeledRows(pane, pushField, { knownFields: false });
  }

  const customFieldsNormalized = {};
  for (const field of fields) {
    const key = normalizeFieldKey(field.label);
    if (key && customFieldsNormalized[key] == null) {
      customFieldsNormalized[key] = field.value;
    }
  }

  return { customFields: fields, customFieldsNormalized };
}

function collectDtDd(root, pushField, { knownFields } = { knownFields: true }) {
  for (const dt of root.querySelectorAll('dt')) {
    const dd = dt.nextElementSibling;
    if (dd && dd.tagName === 'DD') {
      const label = cleanText(dt.innerText);
      if (!looksLikeLabel(label) || !isFieldLabel(label, knownFields)) continue;
      pushField(label, dd.innerText);
    }
  }
}

function collectLabeledRows(root, pushField, { knownFields }) {
  const candidates = root.querySelectorAll(
    'label, dt, legend, th, [role="term"], span, div, p, h3, h4, h5'
  );
  for (const el of candidates) {
    if (el.childElementCount > 4) continue;
    if (!isVisible(el)) continue;
    const label = cleanText(el.innerText);
    if (!label || label.length > MAX_FIELD_LABEL_LEN) continue;
    if (!looksLikeLabel(label)) continue;
    if (!isFieldLabel(label, knownFields)) continue;
    const value = readValueNear(el);
    if (value) pushField(label, value);
  }
}

function looksLikeLabel(label) {
  if (/[.?!]/.test(label)) return false;
  if (label.split(/\s+/).length > 10) return false;
  return true;
}

function isFieldLabel(label, knownFields) {
  if (LABELS.traiderPrefix.test(label)) return true;
  if (!knownFields) return false;
  const stripped = label.replace(LABELS.traiderPrefix, '').trim();
  return Object.values(LABELS.fieldNames).some((re) => re.test(stripped));
}

function normalizeFieldKey(label) {
  const stripped = label.replace(LABELS.traiderPrefix, '').trim();
  for (const [key, re] of Object.entries(LABELS.fieldNames)) {
    if (re.test(stripped) || re.test(label)) return key;
  }
  return null;
}

function readValueNear(labelEl) {
  const next = labelEl.nextElementSibling;
  if (next) {
    const v = cleanText(next.innerText);
    if (v && v !== cleanText(labelEl.innerText) && v.length < 200) return v;
  }

  const parent = labelEl.parentElement;
  if (parent) {
    const valueEl = parent.querySelector(
      'dd, [data-test-id*="value"], [data-test-id*="field-value"], input, textarea, select'
    );
    if (valueEl && valueEl !== labelEl) {
      const v = cleanText(
        valueEl.value || valueEl.getAttribute('value') || valueEl.innerText
      );
      if (v && v !== cleanText(labelEl.innerText)) return v;
    }

    const chunks = [...parent.children]
      .filter((c) => c !== labelEl)
      .map((c) => cleanText(c.innerText))
      .filter(Boolean);
    if (chunks.length === 1 && chunks[0] !== cleanText(labelEl.innerText)) {
      return chunks[0];
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Publish + SPA observer
// ---------------------------------------------------------------------------

let lastFingerprint = null;
let debounceTimer = null;
let observer = null;

function buildTicket() {
  const id = extractTicketId();
  if (!id) return null;
  const { customFields, customFieldsNormalized } = extractCustomFields();
  return {
    id,
    subject: extractSubject(id),
    url: location.href,
    extractedAt: new Date().toISOString(),
    messages: extractMessages(),
    customFields,
    customFieldsNormalized,
  };
}

function fingerprint(ticket) {
  if (!ticket) return 'cleared:' + location.pathname;
  return JSON.stringify({
    id: ticket.id,
    subject: ticket.subject,
    url: ticket.url.split('?')[0],
    n: ticket.messages.length,
    last: ticket.messages[ticket.messages.length - 1]?.text?.slice(0, 120) || '',
    fields: ticket.customFields,
  });
}

function publish(force) {
  const ticket = buildTicket();
  if (!ticket) {
    const fp = 'cleared:' + location.pathname;
    if (!force && fp === lastFingerprint) return null;
    lastFingerprint = fp;
    const reason =
      'No ticket is selected. Open a ticket in the workspace — a views/list URL is not enough unless a ticket pane is open.';
    console.info('[Arbitrip Copilot]', reason, location.pathname);
    send({ type: 'TICKET_CLEARED', reason });
    return null;
  }

  const fp = fingerprint(ticket);
  if (!force && fp === lastFingerprint) return ticket;
  lastFingerprint = fp;
  console.info(
    '[Arbitrip Copilot] extracted ticket',
    ticket.id,
    'messages',
    ticket.messages.length,
    'fields',
    ticket.customFields.length
  );
  send({ type: 'TICKET_EXTRACTED', ticket });
  return ticket;
}

function send(message) {
  try {
    const p = chrome.runtime.sendMessage(message);
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* extension context invalidated after reload */
  }
}

function schedulePublish() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(publish, DEBOUNCE_MS);
}

function startObserver() {
  if (observer) observer.disconnect();
  const target = queryFirst(document, SELECTORS.ticketPane) || document.body;
  observer = new MutationObserver(schedulePublish);
  observer.observe(target, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function hookHistory() {
  const wrap = (fn) =>
    function patched() {
      const ret = fn.apply(this, arguments);
      schedulePublish();
      startObserver();
      return ret;
    };
  history.pushState = wrap(history.pushState.bind(history));
  history.replaceState = wrap(history.replaceState.bind(history));
  window.addEventListener('popstate', () => {
    schedulePublish();
    startObserver();
  });
}

if (window.__arbitripCopilotInjected) {
  schedulePublish();
} else {
  window.__arbitripCopilotInjected = true;
  startObserver();
  hookHistory();
  schedulePublish();
  setTimeout(() => publish(true), 800);
  setTimeout(startObserver, 1200);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== 'EXTRACT_NOW') return undefined;
    const ticket = publish(true);
    sendResponse(
      ticket
        ? { ok: true, ticketId: ticket.id }
        : { ok: false, reason: 'No ticket is selected on this tab.' }
    );
    return undefined;
  });
}
