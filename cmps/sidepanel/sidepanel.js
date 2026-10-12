import { els } from './state.js';
import { render } from './render.js';
import { onGenerate } from './generate-ui.js';
import { onCopy } from './copy-ui.js';
import { onHebrewSection } from './hebrew-click.js';
import { connectPort } from './port.js';

els.generateBtn.addEventListener('click', onGenerate);

document.addEventListener('click', function (event) {
  var sectionBtn = event.target.closest('[data-he-section]');
  if (sectionBtn && els.langBar && els.langBar.contains(sectionBtn)) {
    onHebrewSection(sectionBtn.getAttribute('data-he-section'));
    return;
  }
  var btn = event.target.closest('[data-copy-id]');
  if (!btn) return;
  if (!els.summaryBody.contains(btn) && !els.draftsBody.contains(btn)) return;
  onCopy(btn.getAttribute('data-copy-id'));
});

connectPort();
render();
