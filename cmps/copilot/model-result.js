import { mergeTicketNote } from './note-fields.js';
import { normalizeParty } from './party.js';

export function normalizeModelResult(parsed, source) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (!parsed.drafts || !parsed.drafts.length) return null;
  var drafts = [];
  for (var i = 0; i < parsed.drafts.length; i++) {
    var d = parsed.drafts[i];
    if (!d || !d.text) continue;
    var text = String(d.text).trim();
    if (!text) continue;
    var party = normalizeParty(d.party);
    drafts.push({
      id: 'llm-' + party + '-' + i,
      party: party,
      label: d.label || party,
      hint: d.hint || '',
      text: text,
    });
  }
  if (drafts.length === 0) return null;
  return {
    ok: true,
    source: source,
    summary: { note: mergeTicketNote(parsed.note, null) },
    drafts: drafts,
  };
}
