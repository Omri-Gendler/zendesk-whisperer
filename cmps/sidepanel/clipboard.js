import { formatTicketNote } from '../copilot/note-fields.js';
import { state } from './state.js';

export function textForCopy(id) {
  if (id === 'summary-note') return formatTicketNote(state.summary && state.summary.note);
  for (var i = 0; i < state.drafts.length; i++) {
    if (state.drafts[i].id === id) return state.drafts[i].text || '';
  }
  return '';
}

export async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
