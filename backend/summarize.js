/**
 * On-device ticket summary. No network. No OpenAI.
 * Cleans Zendesk/email chrome, pulls out facts, then writes a short synthesis
 * — not a paste of the raw thread.
 */

const ISSUE_TYPES = [
  {
    id: 'points',
    type: 'Loyalty points / credit',
    typeHe: 'נקודות / זיכוי נקודות',
    keywords: [
      'points', 'נקודות', 'נקודה', 'taken incorrectly', 'נלקחו', 'נמשכו',
      'poalim', 'wonder', 'miles', 'מיילים',
    ],
  },
  {
    id: 'late-arrival',
    type: 'Late arrival — room hold',
    typeHe: 'הגעה מאוחרת — החזקת חדר',
    keywords: [
      'late arrival', 'after midnight', 'flight delay', 'hold the room', 'check-in מאוחר',
      'הגעה מאוחרת', 'איחור', 'חצות', 'טיסה התעכבה', 'הגעה בלילה',
    ],
  },
  {
    id: 'cancellation',
    type: 'Cancellation / refund',
    typeHe: 'ביטול / זיכוי הזמנה',
    keywords: [
      'cancel', 'cancellation', 'refund', 'non-refundable', 'penalty',
      'ביטול', 'לבטל הזמנה', 'לא ניתן לביטול', 'קנס ביטול',
    ],
  },
  {
    id: 'no-show',
    type: 'No-show',
    typeHe: 'אי-הגעה (No-Show)',
    keywords: ['no-show', 'no show', 'אי הגעה', 'לא הגיע', 'לא הגיעה', 'לא הגיעו'],
  },
  {
    id: 'rate',
    type: 'Rate discrepancy',
    typeHe: 'פער תעריף',
    keywords: [
      'rate discrepancy', 'overcharged', 'charged a different',
      'פער מחיר', 'תעריף', 'חיוב שגוי', 'מחיר שונה', 'חיוב כפול',
    ],
  },
  {
    id: 'modification',
    type: 'Booking modification',
    typeHe: 'שינוי הזמנה',
    keywords: ['modify', 'change dates', 'date change', 'שינוי תאריך', 'להקדים', 'לדחות', 'שינוי הזמנה'],
  },
];

function hasHebrew(text) {
  return /[\u0590-\u05FF]/.test(text || '');
}

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trim() + '…';
}

function firstSentence(text, max = 140) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const cut = t.split(/(?<=[.!?…])\s+/)[0] || t;
  return clip(cut, max);
}

function stripLeadingAuthor(text, author) {
  if (!author) return text;
  const escaped = author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp('^' + escaped + '\\s*[·•:]?\\s*', 'i'), '');
}

function cleanAuthor(name) {
  let a = String(name || '')
    .replace(/\s*[·•].*$/, '')
    .replace(/\s+Internal$/i, '')
    .trim();
  const parts = a.split(/\s+/);
  if (parts.length >= 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) a = parts[0];
  return a;
}

function cleanMessageText(raw) {
  let t = String(raw || '');
  t = t.replace(/\bShow more\b/gi, ' ');
  t = t.replace(/\bShow less\b/gi, ' ');
  t = t.replace(/^(Public reply|Internal note|Private comment|Email|WhatsApp|Web|Chat|הערה פנימית)\s*/gim, '');
  t = t.replace(/\bTo:\s*[A-Za-z0-9@._+\-\s]{0,60}/g, ' ');
  t = t.replace(/\b(Yesterday|Today|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+\d{1,2}:\d{2}\b/gi, ' ');
  t = t.replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4},?\s+at\s+\d{1,2}:\d{2}\s*[AP]M\b/gi, ' ');
  t = t.replace(/<[^>\s]+@[^>]+>/g, ' ');
  t = t.replace(/Best Regards[\s\S]*/i, ' ');
  t = t.replace(/Kind regards[\s\S]*/i, ' ');
  t = t.replace(/בברכה[\s\S]*/i, ' ');
  t = t.replace(/\|\s*EL AL Travel[\s\S]*/i, ' ');
  t = t.replace(/powered by Arbitrip[\s\S]*/i, ' ');
  t = t.replace(/EL AL Travel support/gi, ' ');
  t = t.replace(/\bRe:\s*/gi, ' ');
  t = t.replace(/\[\s*EL AL Travel\s*\]/gi, ' ');
  t = t.replace(/\s{2,}/g, ' ');
  return t.trim();
}

function isSystemEvent(text) {
  return /update is required|has been reopened|follow-up the customer|assigned to|ticket has been/i.test(
    text || ''
  );
}

function isAgent(author, text, rawText, internalAuthors) {
  const blob = `${author || ''} ${text || ''} ${rawText || ''}`.toLowerCase();
  if (/arbitrip|customer success|support@|powered by|best regards|בברכה/.test(blob)) {
    return true;
  }
  if (author && internalAuthors && internalAuthors.has(author.toLowerCase())) return true;
  return false;
}

function classify(msg, internalAuthors) {
  const text = msg.text || '';
  const author = msg.author || '';
  if (isSystemEvent(text) || isSystemEvent(msg.rawText)) return 'system';
  if (msg.visibility === 'internal') return 'internal';
  if (/hotel|front desk|מלון|קבלה/i.test(author)) return 'hotel';
  if (/supplier|bedbank|ספק/i.test(author)) return 'supplier';
  if (isAgent(author, text, msg.rawText, internalAuthors)) return 'agent';
  return 'client';
}

function extractFacts(ticket, messages) {
  const blob = [ticket.subject, ...messages.map((m) => m.text)].join('\n');
  const order =
    blob.match(/\b[A-Z0-9]{2,4}-[A-Z0-9]{3,5}\b/) ||
    blob.match(/\b(?:order|הזמנה|reservation)\s*[:#]?\s*([A-Z0-9-]{4,})\b/i);
  const points = blob.match(/([\d,]{2,})\s*(?:points|נקודות)/i);
  const followUp = blob.match(/follow-up the customer at\s+(\d{4}-\d{2}-\d{2})/i);
  const n = ticket.customFieldsNormalized || {};
  return {
    orderId: (order && (order[1] || order[0])) || n.reservationId || '',
    points: points ? points[1] : '',
    followUpDate: followUp ? followUp[1] : '',
    checkIn: n.checkIn || '',
    checkOut: n.checkOut || '',
  };
}

function inferIssue(ticket, messages, hebrew) {
  const blob = [ticket.subject, ...messages.map((m) => m.text)].join('\n').toLowerCase();
  for (const row of ISSUE_TYPES) {
    if (row.keywords.some((k) => blob.includes(k.toLowerCase()))) {
      return { id: row.id, label: hebrew ? row.typeHe : row.type };
    }
  }
  const subject = clip(ticket.subject || '', 80);
  return { id: 'general', label: subject || (hebrew ? 'פנייה כללית' : 'General inquiry') };
}

function inferWaitingOn(messages, issueId) {
  const last = messages[messages.length - 1];
  if (!last) return 'internal';
  const role = last.role;
  const text = last.text || '';

  if (role === 'system' || /follow-up the customer/i.test(text)) return 'client';
  if (role === 'client') return 'internal';
  if (role === 'agent' && /[?؟]|please confirm|נודה|אנא|נשמח אם/.test(text)) return 'client';
  if (issueId === 'points') return role === 'internal' ? 'internal' : 'client';
  if (role === 'hotel') return 'internal';
  if (role === 'supplier') return 'internal';
  if (issueId === 'late-arrival' || issueId === 'rate') return 'hotel';
  if (role === 'internal') return 'internal';
  if (role === 'agent') return 'client';
  return 'internal';
}

function inferUrgency(issueId, messages, hebrew) {
  const blob = messages.map((m) => m.text).join('\n').toLowerCase();
  if (/update is required|reopened|דחוף|asap|urgent/.test(blob)) {
    return hebrew ? 'גבוה — הכרטיס נפתח מחדש למעקב' : 'High — ticket reopened for follow-up';
  }
  if (issueId === 'late-arrival') {
    return hebrew ? 'גבוה — תאריכי שהייה רגישים לזמן' : 'High — time-sensitive stay dates';
  }
  if (issueId === 'points' || issueId === 'rate') {
    return hebrew ? 'בינוני — כסף / נקודות ממתינים לבירור' : 'Medium — money or points pending confirmation';
  }
  if (issueId === 'cancellation') {
    return hebrew ? 'בינוני — נדרש אישור מדיניות' : 'Medium — policy confirmation needed';
  }
  return hebrew ? 'רגיל' : 'Normal';
}

function synthesizeTimeline(ticket, messages, facts, hebrew) {
  const factsLine = [];
  if (facts.orderId) {
    factsLine.push(hebrew ? `מספר הזמנה ${facts.orderId}` : `Order ${facts.orderId}`);
  }
  if (facts.points) {
    factsLine.push(hebrew ? `${facts.points} נקודות` : `${facts.points} points`);
  }

  const out = [];
  const clientMsgs = messages.filter((m) => m.role === 'client');
  const firstClient =
    clientMsgs.find((m) => /נקודות|points|ביטול|cancel|הזמנה|order|חיוב/i.test(m.text)) ||
    clientMsgs[0];
  if (firstClient) {
    out.push(
      hebrew
        ? `הלקוח (${firstClient.author || 'לקוח'}) פנה: ${firstSentence(firstClient.text)}`
        : `Customer (${firstClient.author || 'client'}) raised: ${firstSentence(firstClient.text)}`
    );
  } else if (ticket.subject) {
    out.push(hebrew ? `נושא הפנייה: ${clip(ticket.subject, 100)}` : `Ticket subject: ${clip(ticket.subject, 100)}`);
  }

  const internalWithFacts = messages.find(
    (m) => m.role === 'internal' && (facts.orderId || facts.points) && m.text
  );
  if (internalWithFacts) {
    const extra = factsLine.length
      ? factsLine.join(hebrew ? ', ' : ', ')
      : firstSentence(internalWithFacts.text);
    out.push(
      hebrew
        ? `${internalWithFacts.author || 'סוכן'} תיעד פנימית: ${extra}`
        : `${internalWithFacts.author || 'Agent'} noted internally: ${extra}`
    );
  }

  const lastAgent = [...messages].reverse().find((m) => m.role === 'agent');
  if (lastAgent && (!firstClient || lastAgent.text !== firstClient.text)) {
    out.push(
      hebrew
        ? `${lastAgent.author || 'סוכן'} השיב ללקוח: ${firstSentence(lastAgent.text)}`
        : `${lastAgent.author || 'Agent'} replied: ${firstSentence(lastAgent.text)}`
    );
  }

  const lastHotel = [...messages].reverse().find((m) => m.role === 'hotel');
  if (lastHotel) {
    out.push(
      hebrew
        ? `בית המלון (${lastHotel.author}): ${firstSentence(lastHotel.text)}`
        : `Hotel (${lastHotel.author}): ${firstSentence(lastHotel.text)}`
    );
  }

  const system = [...messages].reverse().find((m) => m.role === 'system');
  if (system) {
    if (facts.followUpDate) {
      out.push(
        hebrew
          ? `הכרטיס נפתח מחדש למעקב לקוח ב־${facts.followUpDate}`
          : `Ticket reopened for customer follow-up on ${facts.followUpDate}`
      );
    } else {
      out.push(
        hebrew ? 'הכרטיס נפתח מחדש / דורש עדכון' : 'Ticket reopened / update required'
      );
    }
  }

  const unique = [];
  const seen = new Set();
  for (const line of out) {
    const key = line.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }
  return unique.slice(0, 6);
}

function inferBlocker(waitingOn, issue, facts, messages, hebrew) {
  const waiting = {
    client: hebrew ? 'הלקוח' : 'the customer',
    hotel: hebrew ? 'בית המלון' : 'the hotel',
    supplier: hebrew ? 'הספק' : 'the supplier',
    internal: hebrew ? 'הסוכן (Arbitrip)' : 'the Arbitrip agent',
  }[waitingOn];

  if (issue.id === 'points') {
    const bits = [];
    if (facts.points) bits.push(hebrew ? `${facts.points} נקודות` : `${facts.points} points`);
    if (facts.orderId) bits.push(hebrew ? `הזמנה ${facts.orderId}` : `order ${facts.orderId}`);
    const what = bits.length
      ? bits.join(hebrew ? ', ' : ', ')
      : hebrew
        ? 'הנקודות שנטען שנלקחו שלא כהלכה'
        : 'the points the customer says were taken incorrectly';
    if (waitingOn === 'client') {
      return hebrew
        ? `צריך לחזור ללקוח לגבי ${what}. הכרטיס במעקב — לא לשלוח תשובה סופית לפני אישור פנימי.`
        : `Need to follow up with the customer about ${what}. Do not send a final reply before internal confirmation.`;
    }
    return hebrew
      ? `חסם: לא אושר עדיין מה קרה עם ${what}. ממתינים ל־${waiting}.`
      : `Blocker: still unconfirmed what happened with ${what}. Waiting on ${waiting}.`;
  }

  const lastClient = [...messages].reverse().find((m) => m.role === 'client');
  if (waitingOn === 'internal' && lastClient) {
    return hebrew
      ? `הלקוח ממתין לתשובה אחרי: "${firstSentence(lastClient.text, 100)}"`
      : `Customer is waiting for a reply after: "${firstSentence(lastClient.text, 100)}"`;
  }
  return hebrew
    ? `הפנייה תקועה עד שיתקבל עדכון מ־${waiting}.`
    : `This is stuck until ${waiting} replies or confirms.`;
}

function partiesForDrafts(issueId, messages, waitingOn) {
  const roles = new Set(messages.map((m) => m.role));
  const parties = ['client', 'internal'];
  if (issueId === 'late-arrival' || issueId === 'rate' || roles.has('hotel') || waitingOn === 'hotel') {
    parties.splice(1, 0, 'hotel');
  }
  if (waitingOn === 'supplier' || roles.has('supplier')) {
    if (!parties.includes('supplier')) parties.splice(1, 0, 'supplier');
  }
  if (issueId === 'points' && !roles.has('hotel')) {
    return parties.filter((p) => p !== 'hotel');
  }
  return parties;
}

function draftFor(party, ticket, issue, facts, waitingOn, hebrew) {
  const labels = {
    client: hebrew ? 'תשובה ללקוח' : 'Reply to Client',
    hotel: hebrew ? 'תשובה למלון' : 'Reply to Hotel',
    supplier: hebrew ? 'תשובה לספק' : 'Reply to Supplier',
    internal: hebrew ? 'הערה פנימית' : 'Internal note',
  };
  const orderBit = facts.orderId
    ? hebrew
      ? `הזמנה ${facts.orderId}`
      : `order ${facts.orderId}`
    : '';
  const pointsBit = facts.points
    ? hebrew
      ? `${facts.points} נקודות`
      : `${facts.points} points`
    : '';
  const detail = [orderBit, pointsBit].filter(Boolean).join(hebrew ? ', ' : ', ');

  let text = '';
  if (party === 'internal') {
    text = hebrew
      ? `פנייה #${ticket.id} — ${issue.label}.${detail ? ` ${detail}.` : ''} ממתינים ל־${waitingOn === 'client' ? 'מעקב מול הלקוח' : waitingOn}. לא לשלוח הערה זו ללקוח.`
      : `Ticket #${ticket.id} — ${issue.label}.${detail ? ` ${detail}.` : ''} Waiting on ${waitingOn}. Do not send this note to the customer.`;
  } else if (party === 'client') {
    if (issue.id === 'points') {
      text = hebrew
        ? `שלום, תודה שפניתם בנושא הנקודות.${detail ? ` רשמנו אצלנו ${detail}.` : ''} הבקשה בבדיקה. נחזור אליכם עם תשובה ברורה לגבי הזיכוי — בלי שתצטרכו לפנות שוב בינתיים.`
        : `Hi — thank you for writing about the points.${detail ? ` We have ${detail} on file.` : ''} We are reviewing this and will come back with a clear answer on the credit. No need to chase us in the meantime.`;
    } else {
      text = hebrew
        ? `שלום, תודה על הפנייה בנושא "${clip(ticket.subject || issue.label, 80)}".${detail ? ` ${detail}.` : ''} אנחנו מטפלים בזה ונעדכן ברגע שיש אישור.`
        : `Hi — thank you for writing about "${clip(ticket.subject || issue.label, 80)}".${detail ? ` ${detail}.` : ''} We are on it and will update you as soon as we have confirmation.`;
    }
  } else if (party === 'hotel') {
    text = hebrew
      ? `שלום, פונים לגבי פנייה #${ticket.id}${detail ? ` (${detail})` : ''}. נודה לאישור סטטוס כדי שנוכל לחזור ללקוח.`
      : `Hi — regarding ticket #${ticket.id}${detail ? ` (${detail})` : ''}. Could you confirm current status so we can update the guest?`;
  } else {
    text = hebrew
      ? `שלום, נשמח לאישור לגבי #${ticket.id}${detail ? ` — ${detail}` : ''} כדי לסגור מול הלקוח.`
      : `Hi — please confirm on #${ticket.id}${detail ? ` — ${detail}` : ''} so we can close this with the guest.`;
  }

  return { id: `local-${party}`, party, label: labels[party], text };
}

export function summarizeTicket(ticket) {
  const raw = Array.isArray(ticket.messages) ? ticket.messages : [];
  const internalAuthors = new Set(
    raw
      .filter((m) => m.visibility === 'internal')
      .map((m) => cleanAuthor(m.author).toLowerCase())
      .filter(Boolean)
  );
  const messages = raw
    .map((m) => {
      const rawText = m.text;
      const author = cleanAuthor(m.author);
      const text = stripLeadingAuthor(cleanMessageText(m.text), author);
      const role = classify({ ...m, text, author, rawText }, internalAuthors);
      return { ...m, author, text, role };
    })
    .filter((m) => m.text && m.text.length > 8);

  const hebrew = hasHebrew(
    [ticket.subject, ...messages.map((m) => m.text)].join('\n')
  );
  const issue = inferIssue(ticket, messages, hebrew);
  const facts = extractFacts(ticket, messages);
  const waitingOn = inferWaitingOn(messages, issue.id);
  const timeline = synthesizeTimeline(ticket, messages, facts, hebrew);

  return {
    summary: {
      issueType: issue.label,
      timeline: timeline.length
        ? timeline
        : [
            hebrew
              ? `פנייה #${ticket.id} — אין הודעות ברורות מספיק לסיכום.`
              : `Ticket #${ticket.id} — not enough clean messages to summarize.`,
          ],
      blocker: inferBlocker(waitingOn, issue, facts, messages, hebrew),
      waitingOn,
      urgency: inferUrgency(issue.id, messages, hebrew),
    },
    drafts: partiesForDrafts(issue.id, messages, waitingOn).map((party) =>
      draftFor(party, ticket, issue, facts, waitingOn, hebrew)
    ),
  };
}
