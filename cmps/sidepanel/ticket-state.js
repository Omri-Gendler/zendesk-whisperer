import { formatTicketNote } from '../copilot/note-fields.js';
import { state } from './state.js';
import { draftsForParty } from './sections.js';
import { render } from './render.js';

export function resetHebrew() {
  state.hebrewSelected = { client: false, hotel: false, supplier: false, summary: false };
  state.hebrewTarget = null;
}

export function syncInternalDraftFromNote(note) {
  var list = draftsForParty('internal');
  if (list.length && note) list[0].text = formatTicketNote(note);
}

export function applyTicket(nextTicket) {
  var prevId = state.ticket && state.ticket.id;
  var nextId = nextTicket && nextTicket.id;
  if (prevId !== nextId) {
    state.summary = null;
    state.drafts = [];
    state.errorText = null;
    state.copiedId = null;
    state.loading = false;
    state.loadingText = '';
    state.source = null;
    resetHebrew();
  }
  state.ticket = nextTicket;
  state.clearReason = null;
  render();
}
