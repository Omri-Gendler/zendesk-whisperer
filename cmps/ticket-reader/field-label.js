function looksLikeLabel(label) {
  if (/[.?!]/.test(label)) return false;
  if (label.split(/\s+/).length > 10) return false;
  return true;
}

function isFieldLabel(label, knownFields) {
  if (LABELS.traiderPrefix.test(label)) return true;
  if (!knownFields) return false;
  var stripped = label.replace(LABELS.traiderPrefix, '').trim();
  var keys = Object.keys(LABELS.fieldNames);
  for (var i = 0; i < keys.length; i++) {
    if (LABELS.fieldNames[keys[i]].test(stripped)) return true;
  }
  return false;
}

function normalizeFieldKey(label) {
  var stripped = label.replace(LABELS.traiderPrefix, '').trim();
  var keys = Object.keys(LABELS.fieldNames);
  for (var i = 0; i < keys.length; i++) {
    var re = LABELS.fieldNames[keys[i]];
    if (re.test(stripped) || re.test(label)) return keys[i];
  }
  return null;
}
