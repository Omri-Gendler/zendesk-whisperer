import { hasHebrew } from './hebrew-detect.js';
import { prepareMessages } from './prepare-messages.js';
import { inferIssue } from './infer-issue.js';
import { extractFacts } from './extract-facts.js';
import { inferWaitingOn } from './infer-wait.js';
import { inferBlocker } from './infer-blocker.js';
import { buildTicketNote, partiesForDrafts } from './note-build.js';
import { draftFor } from './draft-for.js';

export function summarizeTicket(ticket, forceHebrew) {
  if (!forceHebrew) forceHebrew = false;
  var messages = prepareMessages(ticket.messages || []);
  var allText = ticket.subject || '';
  var i;
  for (i = 0; i < messages.length; i++) allText += '\n' + messages[i].text;
  var hebrew = forceHebrew || hasHebrew(allText);
  var hotelInHebrew = forceHebrew ? true : false;
  var issue = inferIssue(ticket, messages, hebrew);
  var facts = extractFacts(ticket, messages);
  var waitingOn = inferWaitingOn(messages, issue.id, facts);
  var blocker = inferBlocker(waitingOn, issue, facts, hebrew);
  var parties = partiesForDrafts(issue.id, messages, waitingOn, facts);
  var note = buildTicketNote(ticket, messages, issue, facts, hebrew, blocker);
  var drafts = [];
  for (i = 0; i < parties.length; i++) {
    drafts.push(draftFor(parties[i], i, ticket, issue, facts, messages, hebrew, hotelInHebrew, note));
  }
  return { summary: { note: note }, drafts: drafts };
}
