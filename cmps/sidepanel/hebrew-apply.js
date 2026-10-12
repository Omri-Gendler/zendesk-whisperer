import { state } from './state.js';
import { sectionHasContent, sectionIsHebrew } from './sections.js';
import { convertSection } from './hebrew-convert.js';
import { render } from './render.js';

export async function applyMarkedHebrew() {
  var ids = ['client', 'hotel', 'supplier', 'summary'];
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    if (!state.hebrewSelected[id]) continue;
    if (!sectionHasContent(id) || sectionIsHebrew(id)) continue;
    state.hebrewTarget = id;
    state.errorText = null;
    render();
    var result;
    try {
      result = await convertSection(id);
    } catch (err) {
      result = { ok: false, message: String(err && err.message ? err.message : err) };
    }
    state.hebrewTarget = null;
    state.loadingText = '';
    if (!result || !result.ok) {
      state.hebrewSelected[id] = false;
      state.errorText = (result && result.message) || 'Could not rewrite to Hebrew.';
      render();
      return;
    }
  }
  render();
}
