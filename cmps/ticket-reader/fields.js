function extractCustomFields() {
  var pane = ticketPane();
  var roots = queryAll(document, SELECTORS.customFieldRoot);
  resetCollectedFields();
  for (var i = 0; i < roots.length; i++) {
    collectDtDd(roots[i], true);
    collectLabeledRows(roots[i], true);
  }
  if (pane) {
    collectDtDd(pane, false);
    collectLabeledRows(pane, false);
  }
  var customFieldsNormalized = {};
  for (var j = 0; j < collectedFields.length; j++) {
    var key = normalizeFieldKey(collectedFields[j].label);
    if (key && customFieldsNormalized[key] == null) {
      customFieldsNormalized[key] = collectedFields[j].value;
    }
  }
  return { customFields: collectedFields, customFieldsNormalized: customFieldsNormalized };
}
