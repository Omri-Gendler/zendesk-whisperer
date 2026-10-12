import { els, state } from './state.js';
import { showBanner } from './banner.js';
import { renderPreview } from './render-preview.js';
import { renderSummary } from './render-summary.js';
import { renderDrafts } from './render-drafts.js';
import { renderLangBar, sourceLabel } from './render-lang.js';

export function render() {
  var hasTicket = state.ticket ? true : false;
  els.generateBtn.disabled = !hasTicket || state.loading || (state.hebrewTarget ? true : false);
  if (state.loading) els.generateBtn.textContent = 'Working…';
  else if (state.summary) els.generateBtn.textContent = 'Regenerate';
  else els.generateBtn.textContent = 'Generate';
  if (els.sourceBadge) els.sourceBadge.textContent = sourceLabel(state.source);
  if (!hasTicket) {
    showBanner('error', state.clearReason || "couldn't read this page");
  } else if ((state.loading || state.hebrewTarget) && state.loadingText) {
    showBanner('info', state.loadingText);
  } else {
    showBanner(null);
  }
  renderPreview();
  renderSummary();
  renderDrafts();
  renderLangBar();
}
