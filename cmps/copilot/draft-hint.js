export function draftHint(party, facts, hebrew) {
  if (party === 'client') {
    if (hebrew) return 'תוכל לשלוח את ההודעה הבאה כדי להרגיע ולשקף שהנושא בטיפול מיידי:';
    return 'You can send this to reassure the customer that we are on it immediately:';
  }
  if (party === 'hotel') {
    if (hebrew) return 'מייל לבירור מול ' + (facts.hotel || 'המלון') + ':';
    return 'English email to investigate with ' + (facts.hotel || 'the hotel') + ':';
  }
  if (party === 'supplier') {
    if (hebrew) return 'מייל לבירור מול ' + (facts.channel || 'הספק') + ':';
    return 'English email to investigate with ' + (facts.channel || 'the supplier') + ':';
  }
  if (hebrew) return 'להדבקה כ-Internal Note ב-Zendesk:';
  return 'Paste this as the Zendesk Internal Note:';
}
