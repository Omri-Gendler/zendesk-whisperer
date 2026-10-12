import { state } from './state.js';
import { partyIsHebrew, summaryIsHebrew } from './sections-he.js';

export function draftsForParty(party) {
  var out = [];
  for (var i = 0; i < state.drafts.length; i++) {
    if (state.drafts[i].party === party) out.push(state.drafts[i]);
  }
  return out;
}

export function noteHasContent(note) {
  if (!note) return false;
  if (note.description || note.actionsTaken || note.followUp || note.orderNumber || note.supplierName) {
    return true;
  }
  return false;
}

export function sectionHasContent(section) {
  if (section === 'summary') return noteHasContent(state.summary && state.summary.note);
  var list = draftsForParty(section);
  for (var i = 0; i < list.length; i++) {
    if (list[i].text) return true;
  }
  return false;
}

export function sectionIsHebrew(section) {
  if (section === 'summary') return summaryIsHebrew();
  return partyIsHebrew(section);
}
