import { hasHebrew } from '../copilot/hebrew-detect.js';
import { rewriteToHebrew } from '../copilot/hebrew.js';
import { state } from './state.js';
import { draftsForParty } from './sections.js';
import { onStatus } from './banner.js';
import { convertSummaryToHebrew } from './hebrew-summary.js';

export async function convertPartyToHebrew(party) {
  var list = draftsForParty(party);
  for (var i = 0; i < list.length; i++) {
    var draft = list[i];
    if (!draft.text || hasHebrew(draft.text)) continue;
    var result = await rewriteToHebrew(draft.text, {
      party: draft.party,
      ticket: state.ticket,
      onStatus: onStatus,
    });
    if (!result || !result.ok || !result.text) {
      return { ok: false, message: (result && result.message) || 'Could not rewrite this message to Hebrew.' };
    }
    if (!draft.originalText) draft.originalText = draft.text;
    draft.text = result.text;
  }
  return { ok: true };
}

export async function convertSection(section) {
  if (section === 'summary') return convertSummaryToHebrew();
  return convertPartyToHebrew(section);
}
