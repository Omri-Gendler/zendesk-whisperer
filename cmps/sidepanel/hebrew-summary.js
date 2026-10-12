import { rewriteSummaryToHebrew } from '../copilot/hebrew.js';
import { state } from './state.js';
import { onStatus } from './banner.js';
import { syncInternalDraftFromNote } from './ticket-state.js';

export async function convertSummaryToHebrew() {
  if (!state.summary) return { ok: false, message: 'No summary to rewrite.' };
  var result = await rewriteSummaryToHebrew(state.summary, { onStatus: onStatus });
  if (!result || !result.ok || !result.note) {
    return { ok: false, message: (result && result.message) || 'Could not rewrite the summary to Hebrew.' };
  }
  if (!state.summary.originalNote) {
    state.summary.originalNote = {
      orderNumber: state.summary.note && state.summary.note.orderNumber,
      supplierName: state.summary.note && state.summary.note.supplierName,
      description: state.summary.note && state.summary.note.description,
      actionsTaken: state.summary.note && state.summary.note.actionsTaken,
      followUp: state.summary.note && state.summary.note.followUp,
    };
  }
  state.summary.note = result.note;
  syncInternalDraftFromNote(state.summary.note);
  return { ok: true };
}
