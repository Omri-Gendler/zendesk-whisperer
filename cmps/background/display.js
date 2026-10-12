import { latest, ticketsByTab } from './config.js';
import { persistCache } from './cache.js';
import { broadcast } from './broadcast.js';
import { findRelevantZendeskTab } from './tabs-find.js';

export async function displayTabState(tabId) {
  var relevant = await findRelevantZendeskTab();
  if (!relevant) {
    latest.ticket = null;
    latest.clearReason = 'Open a Zendesk ticket tab, then reopen this panel.';
    persistCache();
    broadcast({ type: 'TICKET_CLEARED', reason: latest.clearReason });
    return;
  }
  if (tabId != null && relevant.id !== tabId) return;
  var entry = ticketsByTab[relevant.id];
  if (entry && entry.ticket) {
    latest.ticket = entry.ticket;
    latest.clearReason = null;
    persistCache();
    broadcast({ type: 'TICKET_UPDATED', ticket: entry.ticket });
    return;
  }
  latest.ticket = null;
  if (entry && entry.reason) latest.clearReason = entry.reason;
  else latest.clearReason = "couldn't read this page";
  persistCache();
  broadcast({ type: 'TICKET_CLEARED', reason: latest.clearReason });
}
