import { phraseRewriteToHebrew } from './rewrite-body.js';
import { summarizeTicket } from './summarize.js';

export function rewriteDraftToHebrew(text, party, ticket) {
  var src = String(text || '').trim();
  if (!src) return '';
  if (ticket && party) {
    var generated = summarizeTicket(ticket, true);
    var drafts = generated.drafts || [];
    for (var i = 0; i < drafts.length; i++) {
      if (drafts[i].party === party && drafts[i].text) return drafts[i].text;
    }
  }
  return phraseRewriteToHebrew(src);
}
