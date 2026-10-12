import { els, state } from './state.js';

export function sourceLabel(value) {
  if (value === 'chrome-ai') return 'On this computer · Nano';
  if (value === 'ollama') return 'On this computer · Ollama';
  if (value === 'rules') return 'On this computer · rules';
  return 'On this computer';
}

export function renderLangBar() {
  if (!els.langBar) return;
  if (!state.ticket || state.loading) {
    els.langBar.hidden = true;
    return;
  }
  els.langBar.hidden = false;
  var ids = ['client', 'hotel', 'supplier', 'summary'];
  var labels = { client: 'לקוח', hotel: 'מלון', supplier: 'ספק', summary: 'סיכום' };
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    var btn = els.langBar.querySelector('[data-he-section="' + id + '"]');
    if (!btn) continue;
    var busy = state.hebrewTarget === id;
    var on = state.hebrewSelected[id] ? true : false;
    btn.disabled = state.hebrewTarget ? true : false;
    if (on && !busy) btn.classList.add('is-on');
    else btn.classList.remove('is-on');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = busy ? '…' : labels[id];
  }
}
