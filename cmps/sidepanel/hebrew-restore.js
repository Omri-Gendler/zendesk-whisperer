import { state } from './state.js';
import { draftsForParty } from './sections.js';
import { syncInternalDraftFromNote } from './ticket-state.js';
import { render } from './render.js';

export function restoreSection(section) {
  if (section === 'summary' && state.summary && state.summary.originalNote) {
    state.summary.note = state.summary.originalNote;
    delete state.summary.originalNote;
    syncInternalDraftFromNote(state.summary.note);
    render();
    return;
  }
  var list = draftsForParty(section);
  for (var i = 0; i < list.length; i++) {
    if (list[i].originalText) list[i].text = list[i].originalText;
  }
  render();
}
