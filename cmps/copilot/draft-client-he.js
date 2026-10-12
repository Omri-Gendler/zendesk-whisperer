export function clientEmailHe(issue, facts, complaint, name, hotel, order, stay) {
  var lines = [];
  if (name) lines.push('היי ' + name + ',');
  else lines.push('היי,');
  lines.push('');
  if (issue.id === 'room') {
    lines.push('אני מבין לגמרי את האכזבה סביב ' + complaint.he + '.');
    if (hotel) {
      lines.push('אני בודק את זה מיד מול הנהלת ' + hotel + ', במטרה לסגור את הפער בין מה שהוזמן לבין מה שקיבלתם.');
    } else {
      lines.push('אני בודק את זה מיד מול המלון, במטרה לסגור את הפער בין מה שהוזמן לבין מה שקיבלתם.');
    }
    lines.push('');
    lines.push('אחזור אליך ברגע שיש עדכון.');
  } else if (facts.refused && hotel) {
    lines.push('פנינו למלון ' + hotel + ' בעניין ההזמנה' + order + stay + '. לצערי המלון לא אישר זיכוי או שינוי.');
    lines.push('');
    lines.push('בשלב זה אני לא ממליץ להזמין שוב בנכס זה. נשמח לעזור במציאת חלופה.');
  } else if (hotel) {
    lines.push('אני בודק את זה מיד מול המלון ' + hotel + order + stay + '. אחזור אליך ברגע שיש תשובה.');
  } else {
    lines.push('תודה על הפנייה בנושא ' + issue.label + order + '. אני מטפל בזה עכשיו.');
    lines.push('');
    lines.push('אחזור אליך ברגע שיש עדכון.');
  }
  if (facts.agentName) {
    lines.push('');
    lines.push('בברכה,');
    lines.push(facts.agentName);
  }
  return lines.join('\n');
}
