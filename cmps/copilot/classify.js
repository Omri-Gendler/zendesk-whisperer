import { isSystemEvent } from './clean-msg.js';

export function classify(msg, internalAuthors) {
  var text = msg.text || '';
  var author = msg.author || '';
  var authorLower = author.toLowerCase();
  if (isSystemEvent(text) || isSystemEvent(msg.rawText)) return 'system';
  if (msg.visibility === 'internal') return 'internal';
  if (authorLower.indexOf('hotel') !== -1 || author.indexOf('מלון') !== -1) return 'hotel';
  if (authorLower.indexOf('supplier') !== -1 || author.indexOf('ספק') !== -1) return 'supplier';
  var blob = (author + ' ' + text).toLowerCase();
  if (blob.indexOf('arbitrip') !== -1 || blob.indexOf('בברכה') !== -1 || blob.indexOf('support@') !== -1) {
    return 'agent';
  }
  if (author && internalAuthors[authorLower]) return 'agent';
  return 'client';
}

export function uniq(list) {
  var out = [];
  var seen = {};
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item) continue;
    if (seen[item]) continue;
    seen[item] = true;
    out.push(item);
  }
  return out;
}
