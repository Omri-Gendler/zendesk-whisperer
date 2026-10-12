import { NOTE_FIELDS } from '../copilot/note-fields.js';
import { els, state } from './state.js';
import { copyButton, escapeHtml } from './escape.js';

export function renderSummary() {
  if (state.loading) {
    els.summaryBody.innerHTML = '<div class="card__loading">Reading the thread and thinking…</div>';
    return;
  }
  if (state.errorText) {
    els.summaryBody.innerHTML = '<div class="card__error">' + escapeHtml(state.errorText) + '</div>';
    return;
  }
  if (!state.summary) {
    els.summaryBody.innerHTML = '<div class="card__empty">Generate to get ready-to-send messages for this ticket.</div>';
    return;
  }
  var note = state.summary.note || {};
  var rows = '';
  for (var i = 0; i < NOTE_FIELDS.length; i++) {
    var field = NOTE_FIELDS[i];
    rows += '<div class="ticket-note__row">';
    rows += '<span class="ticket-note__label">' + escapeHtml(field.label) + ':</span>';
    rows += '<span class="ticket-note__value">' + escapeHtml(note[field.key] || '') + '</span>';
    rows += '</div>';
  }
  els.summaryBody.innerHTML =
    '<div class="ticket-note-wrap">' +
    '<div class="draft-header"><h3 class="draft-title">סיכום</h3>' + copyButton('summary-note') + '</div>' +
    '<div class="ticket-note" dir="rtl">' + rows + '</div>' +
    '</div>';
}
