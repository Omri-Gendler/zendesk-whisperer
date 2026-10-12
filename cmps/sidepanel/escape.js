import { state } from './state.js';

export function escapeHtml(value) {
  var s = String(value == null ? '' : value);
  s = s.replace(/&/g, '&amp;');
  s = s.replace(/</g, '&lt;');
  s = s.replace(/>/g, '&gt;');
  s = s.replace(/"/g, '&quot;');
  return s;
}

export function copyButton(id) {
  if (state.copiedId === id) {
    return '<button type="button" class="btn btn--small btn--success" data-copy-id="' + escapeHtml(id) + '">Copied</button>';
  }
  return '<button type="button" class="btn btn--small btn--outline" data-copy-id="' + escapeHtml(id) + '">Copy</button>';
}
