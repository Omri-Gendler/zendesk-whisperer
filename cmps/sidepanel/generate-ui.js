import { generateOnDevice } from '../copilot/generate.js';
import { state } from './state.js';
import { onStatus } from './banner.js';
import { render } from './render.js';
import { applyMarkedHebrew } from './hebrew-apply.js';

export async function onGenerate() {
  if (!state.ticket || state.loading) return;
  state.loading = true;
  state.loadingText = 'Starting local model…';
  state.errorText = null;
  render();
  var result;
  try {
    result = await generateOnDevice(state.ticket, { onStatus: onStatus });
  } catch (err) {
    result = { ok: false, message: String(err && err.message ? err.message : err) };
  }
  state.loading = false;
  state.loadingText = '';
  if (!result || !result.ok) {
    state.summary = null;
    state.drafts = [];
    state.source = null;
    state.errorText = (result && result.message) || 'Could not generate a local summary.';
    render();
    return;
  }
  state.summary = result.summary;
  state.drafts = result.drafts || [];
  state.source = result.source || 'rules';
  state.errorText = null;
  render();
  await applyMarkedHebrew();
}
