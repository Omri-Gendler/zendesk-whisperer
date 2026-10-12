import { extractJson } from './json.js';
import { mergeTicketNote } from './note-fields.js';
import { rewriteToHebrew } from './hebrew-run.js';
import { rulesSummaryNote } from './hebrew-summary-rules.js';

export async function rewriteSummaryToHebrew(summary, extra) {
  extra = extra || {};
  var note = mergeTicketNote(summary && summary.note ? summary.note : null, null);
  var prompt =
    'Rewrite these internal-note values into professional Israeli Hebrew.\n' +
    'Keep reservation IDs, supplier names, hotel names, dates, and numbers exactly.\n' +
    'Return ONLY JSON with keys description, actionsTaken, followUp.\n' +
    JSON.stringify({
      description: note.description,
      actionsTaken: note.actionsTaken,
      followUp: note.followUp,
    });
  var rewritten = await rewriteToHebrew(prompt, extra);
  var parsed = null;
  if (rewritten.ok) parsed = extractJson(rewritten.text);
  if (parsed && (parsed.description || parsed.actionsTaken || parsed.followUp)) {
    return {
      ok: true,
      note: {
        orderNumber: note.orderNumber,
        supplierName: note.supplierName,
        description: parsed.description != null ? String(parsed.description) : note.description,
        actionsTaken: parsed.actionsTaken != null ? String(parsed.actionsTaken) : note.actionsTaken,
        followUp: parsed.followUp != null ? String(parsed.followUp) : note.followUp,
      },
      source: rewritten.source,
    };
  }
  return rulesSummaryNote(note);
}
