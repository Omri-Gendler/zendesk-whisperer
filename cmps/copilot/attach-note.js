import { formatTicketNote, mergeTicketNote } from './note-fields.js';
import { summarizeTicket } from './summarize.js';

export function attachTicketNote(result, ticket) {
  if (!result || !result.ok) return result;
  var rules = summarizeTicket(ticket || {}, false);
  var fromModel = result.summary && result.summary.note ? result.summary.note : null;
  var fromRules = rules.summary && rules.summary.note ? rules.summary.note : null;
  var note = mergeTicketNote(fromModel, fromRules);
  if (!result.summary) result.summary = {};
  result.summary.note = note;
  var drafts = result.drafts || [];
  for (var i = 0; i < drafts.length; i++) {
    if (drafts[i].party === 'internal') {
      drafts[i].text = formatTicketNote(note);
    }
  }
  return result;
}
