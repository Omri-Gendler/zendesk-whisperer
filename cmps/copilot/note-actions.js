import { firstSentence } from './clip.js';
import { uniq } from './classify.js';
import { lastOfRole } from './infer-wait.js';

export function buildActionsTaken(messages, facts, hebrew) {
  var lastAgent = null;
  for (var i = 0; i < messages.length; i++) {
    if (messages[i].role === 'agent' || messages[i].role === 'internal') {
      lastAgent = messages[i];
    }
  }
  var hotelMsg = lastOfRole(messages, 'hotel');
  var supplierMsg = lastOfRole(messages, 'supplier');
  var parts = [];
  if (lastAgent) parts.push(firstSentence(lastAgent.text, 180));
  if (hotelMsg) {
    if (hebrew) parts.push('התקבלה תשובה מהמלון: ' + firstSentence(hotelMsg.text, 120));
    else parts.push('Hotel replied: ' + firstSentence(hotelMsg.text, 120));
  } else if (supplierMsg) {
    if (hebrew) parts.push('התקבלה תשובה מהספק: ' + firstSentence(supplierMsg.text, 120));
    else parts.push('Supplier replied: ' + firstSentence(supplierMsg.text, 120));
  }
  if (!parts.length) {
    if (hebrew) return 'טרם תועדו פעולות בטיקט.';
    return 'No actions recorded on the ticket yet.';
  }
  return uniq(parts).join(' ');
}
