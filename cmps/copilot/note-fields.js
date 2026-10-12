export var NOTE_FIELDS = [
  { key: 'orderNumber', label: 'מספר הזמנה' },
  { key: 'supplierName', label: 'שם הספק' },
  { key: 'description', label: 'תיאור הפנייה' },
  { key: 'actionsTaken', label: 'פעולות שבוצעו' },
  { key: 'followUp', label: 'הערות והמשך טיפול' },
];

export function emptyTicketNote() {
  return {
    orderNumber: '',
    supplierName: '',
    description: '',
    actionsTaken: '',
    followUp: '',
  };
}

export function formatTicketNote(note) {
  var n = note || emptyTicketNote();
  var lines = [];
  for (var i = 0; i < NOTE_FIELDS.length; i++) {
    var field = NOTE_FIELDS[i];
    lines.push(field.label + ': ' + (n[field.key] || ''));
  }
  return lines.join('\n');
}

export function mergeTicketNote(primary, fallback) {
  var a = primary || {};
  var b = fallback || emptyTicketNote();
  var out = emptyTicketNote();
  for (var i = 0; i < NOTE_FIELDS.length; i++) {
    var key = NOTE_FIELDS[i].key;
    out[key] = String(a[key] || b[key] || '').trim();
  }
  return out;
}
