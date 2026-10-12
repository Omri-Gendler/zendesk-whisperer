function collectDtDd(root, knownFields) {
  var dts = root.querySelectorAll('dt');
  for (var i = 0; i < dts.length; i++) {
    var dt = dts[i];
    var dd = dt.nextElementSibling;
    if (!dd || dd.tagName !== 'DD') continue;
    var label = cleanText(dt.innerText);
    if (!looksLikeLabel(label) || !isFieldLabel(label, knownFields)) continue;
    pushField(label, dd.innerText);
  }
}

function collectLabeledRows(root, knownFields) {
  var candidates = root.querySelectorAll(
    'label, dt, legend, th, [role="term"], span, div, p, h3, h4, h5'
  );
  for (var i = 0; i < candidates.length; i++) {
    var el = candidates[i];
    if (el.childElementCount > 4) continue;
    if (!isVisible(el)) continue;
    var label = cleanText(el.innerText);
    if (!label || label.length > MAX_FIELD_LABEL_LEN) continue;
    if (!looksLikeLabel(label)) continue;
    if (!isFieldLabel(label, knownFields)) continue;
    var value = readValueNear(el);
    if (value) pushField(label, value);
  }
}
