var collectedFields = [];
var collectedSeen = {};

function resetCollectedFields() {
  collectedFields = [];
  collectedSeen = {};
}

function pushField(label, value) {
  var lab = cleanText(label);
  var val = cleanText(value);
  if (!lab || !val || lab === val) return;
  if (lab.length > MAX_FIELD_LABEL_LEN) return;
  var key = lab.toLowerCase() + '|' + val;
  if (collectedSeen[key]) return;
  collectedSeen[key] = true;
  collectedFields.push({ label: lab, value: val });
}
