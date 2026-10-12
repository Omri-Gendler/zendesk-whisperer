import { hasHebrew } from '../copilot/hebrew-detect.js';
import { state } from './state.js';
import { draftsForParty } from './sections.js';

export function summaryIsHebrew() {
  var note = state.summary && state.summary.note;
  if (!note) return false;
  var parts = [note.description, note.actionsTaken, note.followUp];
  var found = 0;
  for (var i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    found += 1;
    if (!hasHebrew(parts[i])) return false;
  }
  return found > 0;
}

export function partyIsHebrew(section) {
  var list = draftsForParty(section);
  var withText = 0;
  for (var i = 0; i < list.length; i++) {
    if (!list[i].text) continue;
    withText += 1;
    if (!hasHebrew(list[i].text)) return false;
  }
  return withText > 0;
}

export function sectionCanRestore(section) {
  if (section === 'summary') return !!(state.summary && state.summary.originalNote);
  var list = draftsForParty(section);
  for (var i = 0; i < list.length; i++) {
    if (list[i].originalText && list[i].text !== list[i].originalText) return true;
  }
  return false;
}
