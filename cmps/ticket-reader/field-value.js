function readValueNear(labelEl) {
  var next = labelEl.nextElementSibling;
  if (next) {
    var v = cleanText(next.innerText);
    if (v && v !== cleanText(labelEl.innerText) && v.length < 200) return v;
  }
  var parent = labelEl.parentElement;
  if (!parent) return null;
  var valueEl = parent.querySelector(
    'dd, [data-test-id*="value"], [data-test-id*="field-value"], input, textarea, select'
  );
  if (valueEl && valueEl !== labelEl) {
    var raw = valueEl.value || valueEl.getAttribute('value') || valueEl.innerText;
    var v2 = cleanText(raw);
    if (v2 && v2 !== cleanText(labelEl.innerText)) return v2;
  }
  var chunks = [];
  for (var i = 0; i < parent.children.length; i++) {
    var child = parent.children[i];
    if (child === labelEl) continue;
    var chunk = cleanText(child.innerText);
    if (chunk) chunks.push(chunk);
  }
  if (chunks.length === 1 && chunks[0] !== cleanText(labelEl.innerText)) {
    return chunks[0];
  }
  return null;
}
