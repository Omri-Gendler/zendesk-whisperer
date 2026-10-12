import { rewriteGreeting } from './rewrite-greet.js';

export function phraseRewriteToHebrew(text) {
  var lines = String(text || '').split('\n');
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();
    if (!trimmed) {
      out.push('');
      continue;
    }
    var greet = rewriteGreeting(trimmed);
    if (greet) {
      out.push(greet);
      continue;
    }
    if (trimmed.indexOf('We are writing about') === 0) {
      out.push(trimmed.replace('We are writing about', 'פונים לגבי'));
      continue;
    }
    if (trimmed.indexOf('The guest reported ') === 0) {
      out.push(trimmed.replace('The guest reported ', 'הלקוח דיווח על '));
      continue;
    }
    if (trimmed.indexOf('I will update you as soon as I have an answer.') === 0) {
      out.push('אחזור אליך ברגע שיש תשובה.');
      continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n').trim();
}
