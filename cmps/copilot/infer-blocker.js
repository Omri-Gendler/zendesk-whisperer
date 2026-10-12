export function inferBlocker(waitingOn, issue, facts, hebrew) {
  if (facts.refused && facts.hotel) {
    if (hebrew) {
      return 'המלון (' + facts.hotel + ') סירב לזיכוי/שינוי. לשלוח ללקוח מייל סירוב — לא להבטיח זיכוי.';
    }
    return facts.hotel + ' refused a refund/change. Send the customer a refusal email — do not promise a refund.';
  }
  if (facts.hotel && waitingOn === 'hotel') {
    if (hebrew) return 'הפנייה תקועה עד שיתקבל עדכון מבית המלון (' + facts.hotel + ').';
    return 'Stuck until we hear back from the hotel (' + facts.hotel + ').';
  }
  if (issue.id === 'points') {
    if (hebrew) return 'ממתינים לאישור לגבי הנקודות. לא לשלוח תשובה סופית לפני אישור.';
    return 'Waiting on confirmation about the points. Do not send a final reply before confirmation.';
  }
  if (hebrew) return 'הפנייה תקועה עד שיתקבל עדכון.';
  return 'This is stuck until we get an update.';
}
