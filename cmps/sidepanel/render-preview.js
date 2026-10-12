import { els, state } from './state.js';
import { escapeHtml } from './escape.js';

export function renderPreview() {
  if (!state.ticket) {
    els.previewHint.textContent = 'Nothing read yet';
    els.previewBody.innerHTML = '<p class="muted">Open a Zendesk ticket to see what the AI will receive.</p>';
    return;
  }
  var messages = state.ticket.messages || [];
  els.previewHint.textContent = '#' + state.ticket.id + ' · ' + messages.length + ' messages';
  var html = '';
  html += '<div class="preview__row"><span class="preview__label">Ticket</span>#' + escapeHtml(state.ticket.id) + '</div>';
  html += '<div class="preview__row"><span class="preview__label">Subject</span>' + escapeHtml(state.ticket.subject || '(no subject found)') + '</div>';
  html += '<div class="preview__row"><span class="preview__label">Thread</span>' + messages.length + ' visible messages</div>';
  var fields = state.ticket.customFields || [];
  if (!fields.length) {
    html += '<p class="muted">No Traider / custom fields matched on this page.</p>';
  } else {
    for (var i = 0; i < fields.length; i++) {
      html += '<div class="preview__row"><span class="preview__label">' + escapeHtml(fields[i].label) + '</span>' + escapeHtml(fields[i].value) + '</div>';
    }
  }
  els.previewBody.innerHTML = html;
}
