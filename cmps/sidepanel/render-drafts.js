import { els, PARTY_LABEL, state } from './state.js';
import { copyButton, escapeHtml } from './escape.js';

export function renderDrafts() {
  if (state.loading || !state.summary) {
    els.draftsBody.innerHTML = '';
    return;
  }
  if (!state.drafts.length) {
    els.draftsBody.innerHTML = '<div class="card__empty">No copy-paste drafts for this ticket.</div>';
    return;
  }
  var order = ['client', 'hotel', 'supplier', 'internal'];
  var html = '';
  for (var o = 0; o < order.length; o++) {
    for (var i = 0; i < state.drafts.length; i++) {
      var d = state.drafts[i];
      if (d.party !== order[o]) continue;
      var hint = '';
      if (d.hint) hint = '<p class="draft-hint" dir="auto">' + escapeHtml(d.hint) + '</p>';
      html += '<article class="draft party--' + escapeHtml(d.party) + '">';
      html += '<div class="draft-header"><h3 class="draft-title">' + escapeHtml(d.label || PARTY_LABEL[d.party]) + '</h3>';
      html += copyButton(d.id) + '</div>';
      html += hint;
      html += '<pre class="draft-frame" dir="auto">' + escapeHtml(d.text) + '</pre>';
      html += '</article>';
    }
  }
  els.draftsBody.innerHTML = html;
}
