import { cleanAuthor, cleanMessageText } from './clean-msg.js';
import { classify } from './classify.js';

export function prepareMessages(raw) {
  var internalAuthors = {};
  var i;
  for (i = 0; i < raw.length; i++) {
    if (raw[i].visibility === 'internal' && raw[i].author) {
      internalAuthors[cleanAuthor(raw[i].author).toLowerCase()] = true;
    }
  }
  var messages = [];
  for (i = 0; i < raw.length; i++) {
    var author = cleanAuthor(raw[i].author);
    var text = cleanMessageText(raw[i].text);
    if (author && text.indexOf(author) === 0) {
      text = text.slice(author.length).replace(/^[·•:\s]+/, '').trim();
    }
    if (!text || text.length <= 8) continue;
    var msg = {
      author: author,
      text: text,
      rawText: raw[i].text,
      visibility: raw[i].visibility,
      role: '',
    };
    msg.role = classify(msg, internalAuthors);
    messages.push(msg);
  }
  return messages;
}
