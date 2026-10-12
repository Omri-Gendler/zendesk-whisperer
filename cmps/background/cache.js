import { latest } from './config.js';

export async function restoreCache() {
  try {
    var stored = await chrome.storage.session.get(['latestTicket', 'latestClearReason']);
    if (latest.liveUpdate) return;
    if (stored.latestTicket) latest.ticket = stored.latestTicket;
    if (stored.latestClearReason) latest.clearReason = stored.latestClearReason;
  } catch (e) {}
}

export async function persistCache() {
  try {
    await chrome.storage.session.set({
      latestTicket: latest.ticket,
      latestClearReason: latest.clearReason,
    });
  } catch (e) {}
}

export function snapshotMessage() {
  if (latest.ticket) {
    return { type: 'TICKET_UPDATED', ticket: latest.ticket };
  }
  return {
    type: 'TICKET_CLEARED',
    reason: latest.clearReason || "couldn't read this page",
  };
}
