import { state } from './state.js';
import { resetHebrew } from './ticket-state.js';
import { render } from './render.js';

export function applyCleared(reason) {
  state.ticket = null;
  state.summary = null;
  state.drafts = [];
  state.loading = false;
  state.loadingText = '';
  state.errorText = null;
  state.copiedId = null;
  state.source = null;
  resetHebrew();
  state.clearReason = reason || "couldn't read this page";
  render();
}
