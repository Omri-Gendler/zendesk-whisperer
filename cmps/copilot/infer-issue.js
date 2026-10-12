import { ISSUE_TYPES } from './issues.js';
import { clip } from './clip.js';

export function inferIssue(ticket, messages, hebrew) {
  var blob = (ticket.subject || '').toLowerCase();
  var i;
  var k;
  for (i = 0; i < messages.length; i++) {
    blob += '\n' + String(messages[i].text || '').toLowerCase();
  }
  for (i = 0; i < ISSUE_TYPES.length; i++) {
    var row = ISSUE_TYPES[i];
    for (k = 0; k < row.keywords.length; k++) {
      if (blob.indexOf(row.keywords[k].toLowerCase()) !== -1) {
        return { id: row.id, label: hebrew ? row.typeHe : row.type };
      }
    }
  }
  if (hebrew) return { id: 'general', label: 'פנייה כללית' };
  return { id: 'general', label: clip(ticket.subject || '', 80) || 'General inquiry' };
}
