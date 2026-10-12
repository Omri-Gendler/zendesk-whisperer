import { state } from './state.js';
import { textForCopy, writeClipboard } from './clipboard.js';
import { render } from './render.js';

export async function onCopy(id) {
  var text = textForCopy(id);
  if (!text) return;
  var ok = await writeClipboard(text);
  if (!ok) {
    state.errorText = 'Could not copy to clipboard.';
    render();
    return;
  }
  state.copiedId = id;
  render();
  setTimeout(function () {
    if (state.copiedId === id) {
      state.copiedId = null;
      render();
    }
  }, 1600);
}
