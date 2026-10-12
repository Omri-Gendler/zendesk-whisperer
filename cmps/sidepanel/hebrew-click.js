import { state } from './state.js';
import { sectionCanRestore } from './sections-he.js';
import { sectionHasContent, sectionIsHebrew } from './sections.js';
import { convertSection } from './hebrew-convert.js';
import { restoreSection } from './hebrew-restore.js';
import { render } from './render.js';

export async function onHebrewSection(section) {
  if (!section || state.loading || state.hebrewTarget) return;
  var turningOn = !state.hebrewSelected[section];
  state.hebrewSelected[section] = turningOn;
  state.errorText = null;
  render();
  if (!state.summary) return;
  if (!turningOn) {
    if (sectionCanRestore(section)) restoreSection(section);
    else render();
    return;
  }
  if (!sectionHasContent(section) || sectionIsHebrew(section)) return;
  state.hebrewTarget = section;
  render();
  var result;
  try {
    result = await convertSection(section);
  } catch (err) {
    result = { ok: false, message: String(err && err.message ? err.message : err) };
  }
  state.hebrewTarget = null;
  state.loadingText = '';
  if (!result || !result.ok) {
    state.hebrewSelected[section] = false;
    state.errorText = (result && result.message) || 'Could not rewrite to Hebrew.';
  }
  render();
}
