import { firstSentence } from './clip.js';

export function inferWaitingOn(messages, issueId, facts) {
  if (!messages.length) return 'internal';
  var last = messages[messages.length - 1];
  if (facts.refused && facts.hotel) return 'internal';
  if (facts.hotel && (issueId === 'cancellation' || issueId === 'late-arrival' || issueId === 'room')) {
    return 'hotel';
  }
  if (last.role === 'client') return 'internal';
  if (last.role === 'hotel' || last.role === 'supplier') return 'internal';
  if (issueId === 'points') return 'client';
  if (last.role === 'agent') return 'client';
  return 'internal';
}

export function lastOfRole(messages, role) {
  for (var i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === role) return messages[i];
  }
  return null;
}

export function clientAsk(messages) {
  var last = lastOfRole(messages, 'client');
  if (!last) return '';
  return firstSentence(last.text, 180);
}
