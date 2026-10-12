/**
 * On-device fallback: no network. Builds the internal note + copy-paste drafts.
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
    id: 'room',
    type: 'Room / amenities mismatch',
    typeHe: 'פער בין ההזמנה לחדר',
    keywords: [
      'balcony', 'מרפסת', 'sea view', 'נוף לים', 'wrong room', 'חדר שונה',
      'no window', 'suffocat', 'מחנק', 'אכזבה מהחדר',
    ],
  },
  {
    id: 'modification',
    type: 'Booking modification',
    typeHe: 'שינוי הזמנה',
    keywords: ['modify', 'change dates', 'date change', 'שינוי תאריך', 'להקדים', 'לדחות', 'שינוי הזמנה'],
  },
];

const HOTEL_BRANDS =
  /\b((?:The\s+)?(?:Holiday Inn|Hilton|Marriott|Sheraton|Hyatt|Ibis|Novotel|Crowne Plaza|Royal National|La Corte|Best Western|NH Hotels?|Radisson|Mercure|Premier Inn|Altair)[A-Za-z\s'-]{0,40})/i;
const HOTEL_GENERIC = /\b((?:The\s+)?[A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+){0,4}\s+Hotel(?:\s+[A-Z][A-Za-z']+){0,3})\b/;

export function hasHebrew(text) {
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

function uniq(list) {
  const out = [];
  const seen = new Set();
  for (const item of list) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function cleanHotelName(name) {
  return String(name || '')
    .replace(
      /\s+(?:two|reservations?|itinerary|booking|order|regarding|contacted|for|cancel(?:lation)?|refund|הזמנה|ביטול|זיכוי)\b[\s\S]*$/i,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHotel(blob, fields, messages) {
  if (fields.hotel) return cleanHotelName(fields.hotel);
  const body = (messages || []).map((m) => m.text || '').join('\n');
  const fromBody = body.match(HOTEL_BRANDS) || body.match(HOTEL_GENERIC);
  if (fromBody) return cleanHotelName(fromBody[1]);
  const brand = blob.match(HOTEL_BRANDS) || blob.match(HOTEL_GENERIC);
  if (brand) return cleanHotelName(brand[1]);
  const he = (body || blob).match(/מלון\s+([^\n,]{2,40})/);
  if (he) return cleanHotelName(`מלון ${he[1]}`);
  return '';
}

function extractChannel(blob) {
  if (/expedia/i.test(blob)) return 'Expedia';
  if (/booking\.com/i.test(blob)) return 'Booking.com';
  if (/agoda/i.test(blob)) return 'Agoda';
  if (/hotelbeds/i.test(blob)) return 'Hotelbeds';
  return '';
}

function extractGuest(messages) {
  const client = messages.find((m) => m.role === 'client' && m.author);
  if (!client) return { first: '', full: '' };
  const full = String(client.author).replace(/\s+/g, ' ').trim();
  if (!full || /support|arbitrip|elal|team|system/i.test(full)) return { first: '', full: '' };
  const first = full.split(/\s+/)[0];
  return { first, full };
}

function extractAgentName(messages) {
  const msg = [...messages].reverse().find((m) => m.role === 'agent' || m.role === 'internal');
  const name = msg && msg.author ? String(msg.author).split(/\s+/)[0] : '';
  if (!name || /system|support|arbitrip|elal|team/i.test(name)) return '';
  return name;
}

function extractPayment(blob) {
  if (/FLYCARD|Fly\s*Card|כרטיס\s*פליי/i.test(blob)) return 'FLYCARD';
  const card = blob.match(/\b(Mastercard|Visa)\b/i);
  return card ? card[1] : '';
}

function detectComplaint(messages, issue) {
  const blob = messages.filter((m) => m.role === 'client').map((m) => m.text).join('\n');
  if (/מרפסת|balcony/i.test(blob)) {
    return { he: 'החדר בלי המרפסת שהוזמנה', en: 'the room was provided without the balcony that was booked' };
  }
  if (/מחנק|suffocat|אכזב/i.test(blob)) {
    return { he: 'האכזבה מהחדר שקיבלתם', en: 'the disappointment with the room received' };
  }
  if (issue.id === 'points') {
    return { he: 'זיכוי הנקודות', en: 'the points credit' };
  }
  if (issue.id === 'cancellation') {
    return { he: 'ביטול / זיכוי ההזמנה', en: 'a cancellation or refund of the booking' };
  }
  return { he: issue.label, en: issue.label };
}

function extractStay(blob, fields) {
  if (fields.checkIn && fields.checkOut) {
    return `${fields.checkIn}–${fields.checkOut}`;
  }
  const en = blob.match(
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?(?:,?\s*\d{4})?)/i
  );
  if (en) return en[1].replace(/\s+/g, ' ').trim();
  const he = blob.match(/\b(\d{1,2}[./]\d{1,2}[./]\d{2,4}\s*[-–]\s*\d{1,2}[./]\d{1,2}[./]\d{2,4})\b/);
  if (he) return he[1];
  return fields.checkIn || '';
}

function extractFacts(ticket, messages) {
  const blob = [ticket.subject, ...messages.map((m) => `${m.author || ''} ${m.text}`)].join('\n');
  const n = ticket.customFieldsNormalized || {};
  const orders = uniq([
    ...(blob.match(/\b[A-Z0-9]{2,4}-[A-Z0-9]{3,5}\b/g) || []),
    n.reservationId || '',
  ]);
  const itineraries = uniq(blob.match(/\b\d{10,16}\b/g) || []);
  const points = blob.match(/([\d,]{2,})\s*(?:points|נקודות)/i);
  const followUp = blob.match(/follow-up the customer at\s+(\d{4}-\d{2}-\d{2})/i);
  const guest = extractGuest(messages);
  const refused = /refuse|refused|will not refund|no refund|סירב|לא מאשר|לא אישר|לא אישרו/i.test(blob);
  return {
    orderId: orders[0] || '',
    orders,
    itinerary: itineraries[0] || '',
    itineraries,
    points: points ? points[1] : '',
    followUpDate: followUp ? followUp[1] : '',
    stay: extractStay(blob, n),
    hotel: extractHotel(blob, n, messages),
    channel: extractChannel(blob),
    payment: extractPayment(blob),
    guestName: guest.first,
    guestFullName: guest.full,
    agentName: extractAgentName(messages),
    refused,
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
  if (/contact hotel|please contact|מול המלון|בית המלון/i.test(blob)) {
    return { id: 'general', label: hebrew ? 'טיפול מול המלון' : 'Hotel follow-up' };
  }
  return { id: 'general', label: subject || (hebrew ? 'פנייה כללית' : 'General inquiry') };
}

function inferWaitingOn(messages, issueId, facts) {
  const last = messages[messages.length - 1];
  if (!last) return 'internal';
  const role = last.role;
  const hotelIssue =
    Boolean(facts.hotel) &&
    (issueId === 'cancellation' ||
      issueId === 'late-arrival' ||
      issueId === 'rate' ||
      issueId === 'modification' ||
      issueId === 'no-show' ||
      facts.refused ||
      issueId === 'room');
  if (facts.refused && facts.hotel) return 'internal';
  if (hotelIssue) return 'hotel';
  if (role === 'system' || /follow-up the customer/i.test(last.text || '')) return 'internal';
  if (role === 'client') return 'internal';
  if (role === 'agent' && /[?؟]|please confirm|נודה|אנא|נשמח אם/.test(last.text || '')) return 'client';
  if (issueId === 'points') return role === 'internal' ? 'internal' : 'client';
  if (role === 'hotel') return 'internal';
  if (role === 'supplier') return 'internal';
  if (role === 'internal') return facts.hotel ? 'hotel' : 'internal';
  if (role === 'agent') return 'client';
  return 'internal';
}

function lastOfRole(messages, role) {
  return [...messages].reverse().find((m) => m.role === role) || null;
}

function clientAsk(messages) {
  const last = lastOfRole(messages, 'client');
  if (!last) return '';
  const text = String(last.text || '')
    .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\s+\d{1,2}:\d{2}\b/gi, ' ')
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return firstSentence(text, 180);
}

function inferBlocker(waitingOn, issue, facts, hebrew) {
  if (facts.refused && facts.hotel) {
    return hebrew
      ? `המלון (${facts.hotel}) סירב לזיכוי/שינוי. לשלוח ללקוח מייל סירוב — לא להבטיח זיכוי.`
      : `${facts.hotel} refused a refund/change. Send the customer a refusal email — do not promise a refund.`;
  }
  if (facts.hotel && waitingOn === 'hotel') {
    return hebrew
      ? `הפנייה תקועה עד שיתקבל עדכון מבית המלון${facts.hotel ? ` (${facts.hotel})` : ''}.`
      : `Stuck until we hear back from the hotel${facts.hotel ? ` (${facts.hotel})` : ''}.`;
  }
  if (issue.id === 'points') {
    const bits = [];
    if (facts.points) bits.push(hebrew ? `${facts.points} נקודות` : `${facts.points} points`);
    if (facts.orderId) bits.push(hebrew ? `הזמנה ${facts.orderId}` : `order ${facts.orderId}`);
    const what = bits.length ? bits.join(hebrew ? ', ' : ', ') : hebrew ? 'הנקודות' : 'the points';
    const wait =
      waitingOn === 'client'
        ? hebrew
          ? 'ללקוח'
          : 'the customer'
        : hebrew
          ? 'לאישור פנימי'
          : 'internal confirmation';
    return hebrew
      ? `ממתינים ${wait} לגבי ${what}. לא לשלוח תשובה סופית לפני אישור.`
      : `Waiting on ${wait} about ${what}. Do not send a final reply before confirmation.`;
  }
  const waiting = {
    client: hebrew ? 'הלקוח' : 'the customer',
    hotel: hebrew ? 'בית המלון' : 'the hotel',
    supplier: hebrew ? 'הספק' : 'the supplier',
    internal: hebrew ? 'הסוכן (Arbitrip)' : 'the Arbitrip agent',
  }[waitingOn];
  return hebrew
    ? `הפנייה תקועה עד שיתקבל עדכון מ${waiting}.`
    : `This is stuck until we get an update from ${waiting}.`;
}

export const NOTE_FIELDS = [
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
  const n = note || emptyTicketNote();
  return NOTE_FIELDS.map((field) => `${field.label}: ${n[field.key] || ''}`).join('\n');
}

export function mergeTicketNote(primary, fallback) {
  const a = primary || {};
  const b = fallback || emptyTicketNote();
  const out = emptyTicketNote();
  for (const field of NOTE_FIELDS) {
    out[field.key] = String(a[field.key] || b[field.key] || '').trim();
  }
  return out;
}

function buildDescription(issue, facts, messages, hebrew) {
  const ask = clientAsk(messages);
  const hotel = facts.hotel ? (hebrew ? ` במלון ${facts.hotel}` : ` at ${facts.hotel}`) : '';
  const stay = facts.stay ? (hebrew ? ` לתאריכים ${facts.stay}` : ` for ${facts.stay}`) : '';
  if (ask) return clip(`${ask}${hotel}${stay}`, 280);
  return clip(`${issue.label}${hotel}${stay}`, 280);
}

function buildActionsTaken(messages, facts, hebrew) {
  const agents = messages.filter((m) => m.role === 'agent' || m.role === 'internal');
  const hotelMsg = lastOfRole(messages, 'hotel');
  const supplierMsg = lastOfRole(messages, 'supplier');
  const parts = [];
  if (agents.length) {
    parts.push(firstSentence(agents[agents.length - 1].text, 180));
  }
  if (hotelMsg) {
    parts.push(
      hebrew
        ? `התקבלה תשובה מהמלון: ${firstSentence(hotelMsg.text, 120)}`
        : `Hotel replied: ${firstSentence(hotelMsg.text, 120)}`
    );
  } else if (supplierMsg) {
    parts.push(
      hebrew
        ? `התקבלה תשובה מהספק: ${firstSentence(supplierMsg.text, 120)}`
        : `Supplier replied: ${firstSentence(supplierMsg.text, 120)}`
    );
  }
  if (!parts.length) {
    return hebrew ? 'טרם תועדו פעולות בטיקט.' : 'No actions recorded on the ticket yet.';
  }
  return uniq(parts).join(' ');
}

function buildTicketNote(ticket, messages, issue, facts, hebrew, blocker) {
  return {
    orderNumber: facts.orderId || '',
    supplierName: facts.channel || facts.hotel || '',
    description: buildDescription(issue, facts, messages, hebrew),
    actionsTaken: buildActionsTaken(messages, facts, hebrew),
    followUp: blocker || '',
  };
}

function partiesForDrafts(issueId, messages, waitingOn, facts) {
  const roles = new Set(messages.map((m) => m.role));
  const parties = ['client'];
  if (facts.hotel || roles.has('hotel') || waitingOn === 'hotel') parties.push('hotel');
  else if (facts.channel || roles.has('supplier') || waitingOn === 'supplier') parties.push('supplier');
  parties.push('internal');
  if (issueId === 'points' && !facts.hotel && !roles.has('hotel')) {
    return parties.filter((p) => p !== 'hotel');
  }
  return parties;
}

function signOff(facts, hebrew) {
  if (!facts.agentName) return [];
  return hebrew ? ['', 'בברכה,', facts.agentName] : ['', 'Regards,', facts.agentName];
}

function clientEmail(ticket, issue, facts, messages, hebrew) {
  const name = facts.guestName || '';
  const hello = hebrew ? (name ? `היי ${name},` : 'היי,') : name ? `Hi ${name},` : 'Hi,';
  const hotel = facts.hotel;
  const order = facts.orderId
    ? hebrew
      ? ` (הזמנה ${facts.orderId})`
      : ` (order ${facts.orderId})`
    : '';
  const stay = facts.stay ? (hebrew ? ` לתאריכים ${facts.stay}` : ` for ${facts.stay}`) : '';
  const points = facts.points
    ? hebrew
      ? ` ${facts.points} נקודות`
      : ` ${facts.points} points`
    : '';
  const ask = clientAsk(messages);
  const complaint = detectComplaint(messages, issue);
  const via = facts.channel ? (hebrew ? ` ו${facts.channel}` : ` and ${facts.channel}`) : '';

  const lines = [hello, ''];
  if (hebrew) {
    if (issue.id === 'room' || /מרפסת|balcony|מחנק/.test(`${ask} ${complaint.he}`)) {
      lines.push(`אני מבין לגמרי את האכזבה סביב ${complaint.he}.`);
      lines.push(
        `אני בודק את זה מיד מול${hotel ? ` הנהלת ${hotel}` : ' המלון'}${via}, במטרה לסגור את הפער בין מה שהוזמן לבין מה שקיבלתם.`
      );
      lines.push('', 'אחזור אליך ברגע שיש עדכון.');
    } else if (issue.id === 'points') {
      if (/עבר מספיק|חיכיתי|זמן/.test(ask)) {
        lines.push('צודק שעבר מספיק זמן — סליחה על ההמתנה.');
      }
      lines.push(
        `קיבלנו את הפנייה לגבי הנקודות${order}.${points ? ` רשמנו אצלנו${points}.` : ''} אני בודק את זה עכשיו${facts.channel ? ` מול ${facts.channel}` : ''} ואחזור עם תשובה ברורה.`
      );
    } else if (facts.refused && hotel) {
      lines.push(
        `פנינו למלון ${hotel} בעניין ההזמנה${order}${stay}. לצערי המלון לא אישר זיכוי או שינוי.`
      );
      lines.push('', 'בשלב זה אני לא ממליץ להזמין שוב בנכס זה. נשמח לעזור במציאת חלופה.');
    } else if (hotel) {
      lines.push(
        `אני בודק את זה מיד מול המלון ${hotel}${order}${stay}. אחזור אליך ברגע שיש תשובה.`
      );
    } else {
      lines.push(`תודה על הפנייה בנושא ${issue.label}${order}. אני מטפל בזה עכשיו.`);
      lines.push('', 'אחזור אליך ברגע שיש עדכון.');
    }
    lines.push(...signOff(facts, true));
  } else {
    if (issue.id === 'room') {
      lines.push(`I completely understand the disappointment around ${complaint.en}.`);
      lines.push(
        `I am checking this immediately with ${hotel || 'the hotel'}${via}, to close the gap between what was booked and what you received.`
      );
      lines.push('', 'I will update you as soon as I have an answer.');
    } else if (issue.id === 'points') {
      lines.push(
        `We received the points request${order}.${points ? ` We have${points} on file.` : ''} I am checking this now${facts.channel ? ` with ${facts.channel}` : ''} and will come back with a clear answer.`
      );
    } else if (facts.refused && hotel) {
      lines.push(
        `We contacted ${hotel} about the booking${order}${stay}. Unfortunately they would not approve a refund or date change.`
      );
      lines.push('', 'I would not recommend booking this property again. We can help find an alternative.');
    } else if (hotel) {
      lines.push(
        `I am checking this immediately with ${hotel}${order}${stay}. I will update you as soon as I have an answer.`
      );
    } else {
      lines.push(`Thank you for writing — I am on this now${order}.`);
      lines.push('', 'I will update you as soon as I have confirmation.');
    }
    lines.push(...signOff(facts, false));
  }
  return lines.join('\n');
}

function hotelOrSupplierMail(party, ticket, facts, messages, issue, hebrew) {
  const hotel = facts.hotel || '';
  const via = party === 'supplier' || (!hotel && facts.channel) ? facts.channel : '';
  const complaint = detectComplaint(messages, issue);
  if (hebrew) {
    const order = facts.orderId ? ` הזמנה ${facts.orderId}` : ` פנייה #${ticket.id}`;
    const stay = facts.stay ? ` (${facts.stay})` : '';
    const guest = facts.guestFullName || facts.guestName || 'האורח';
    const ask =
      party === 'hotel' && issue.id === 'room'
        ? 'נשמח לאישור אם ניתן לספק חדר עם מרפסת, או פיצוי על הפער.'
        : 'נשמח לאישור סטטוס עדכני (זיכוי / שינוי / דחייה) כדי שנוכל לחזור ללקוח היום.';
    const where = [hotel ? ` במלון ${hotel}` : '', via ? ` דרך ${via}` : ''].join('');
    return [
      'שלום,',
      '',
      `פונים לגבי${order}${stay}${where} עבור ${guest}.`,
      `הלקוח דיווח על ${complaint.he}.`,
      ask,
      '',
      'תודה',
    ].join('\n');
  }
  const order = facts.orderId ? ` reservation ${facts.orderId}` : ` ticket #${ticket.id}`;
  const stay = facts.stay ? ` (${facts.stay})` : '';
  const guest = facts.guestFullName || facts.guestName || 'the guest';
  const ask =
    party === 'hotel' && issue.id === 'room'
      ? 'Please confirm whether a balcony room can be provided, or advise on compensation for the gap.'
      : 'Please confirm current status (refund / change / decline) so we can update the guest today.';
  const where = [hotel ? ` at ${hotel}` : '', via ? ` via ${via}` : ''].join('');
  return [
    'Hello,',
    '',
    `We are writing about${order}${stay}${where} for ${guest}.`,
    `The guest reported ${complaint.en}.`,
    ask,
    '',
    'Thank you',
  ].join('\n');
}

function draftHint(party, facts, hebrew) {
  if (party === 'client') {
    return hebrew
      ? 'תוכל לשלוח את ההודעה הבאה כדי להרגיע ולשקף שהנושא בטיפול מיידי:'
      : 'You can send this to reassure the customer that we are on it immediately:';
  }
  if (party === 'hotel') {
    return hebrew
      ? `מייל לבירור מול ${facts.hotel || 'המלון'}:`
      : `English email to investigate with ${facts.hotel || 'the hotel'}:`;
  }
  if (party === 'supplier') {
    return hebrew
      ? `מייל לבירור מול ${facts.channel || 'הספק'}:`
      : `English email to investigate with ${facts.channel || 'the supplier'}:`;
  }
  return hebrew ? 'להדבקה כ-Internal Note ב-Zendesk:' : 'Paste this as the Zendesk Internal Note:';
}

function draftFor(party, index, ticket, issue, facts, messages, hebrew, hotelInHebrew, note) {
  const n = index + 1;
  const guest = facts.guestFullName || facts.guestName;
  const labels = {
    client: hebrew
      ? `${n}. תגובה ללקוח${guest ? ` (${guest})` : ''}`
      : `${n}. Response to customer${guest ? ` (${guest})` : ''}`,
    hotel: hebrew
      ? `${n}. פנייה למלון${facts.hotel ? ` (${facts.hotel})` : ''}`
      : `${n}. Inquiry to the hotel${facts.hotel ? ` (${facts.hotel})` : ''}`,
    supplier: hebrew
      ? `${n}. פנייה לספק${facts.channel ? ` (${facts.channel})` : ''}`
      : `${n}. Inquiry to the supplier${facts.channel ? ` (${facts.channel})` : ''}`,
    internal: hebrew ? `${n}. הערה פנימית` : `${n}. Internal note`,
  };
  let text = '';
  if (party === 'internal') text = formatTicketNote(note);
  else if (party === 'client') text = clientEmail(ticket, issue, facts, messages, hebrew);
  else text = hotelOrSupplierMail(party, ticket, facts, messages, issue, hotelInHebrew);
  return {
    id: `local-${party}`,
    party,
    label: labels[party],
    hint: draftHint(party, facts, party === 'client' || party === 'internal' ? hebrew : hotelInHebrew),
    text,
  };
}

function phraseRewriteToHebrew(text) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      const pairs = [
        [/^Hello,?$/i, 'שלום,'],
        [/^Hi,?$/i, 'היי,'],
        [/^Dear\s+(.+),?$/i, 'שלום $1,'],
        [/^Thank you\.?$/i, 'תודה'],
        [/^Thanks\.?$/i, 'תודה'],
        [/^Regards,?$/i, 'בברכה,'],
        [/^Best regards,?$/i, 'בברכה,'],
        [/^We are writing about/i, 'פונים לגבי'],
        [/^Following up on/i, 'בהמשך ל'],
        [/^The guest reported /i, 'הלקוח דיווח על '],
        [/^Please confirm current status \(refund \/ change \/ decline\) so we can update the guest today\.$/i,
          'נשמח לאישור סטטוס עדכני (זיכוי / שינוי / דחייה) כדי שנוכל לחזור ללקוח היום.'],
        [/^Please confirm whether a balcony room can be provided, or advise on compensation for the gap\.$/i,
          'נשמח לאישור אם ניתן לספק חדר עם מרפסת, או פיצוי על הפער.'],
        [/^I will update you as soon as I have an answer\.$/i, 'אחזור אליך ברגע שיש תשובה.'],
        [/^I will update you as soon as I have confirmation\.$/i, 'אחזור אליך ברגע שיש אישור.'],
        [/^Thank you for writing — I am on this now/i, 'תודה על הפנייה — אני מטפל בזה עכשיו'],
        [/^Blocker$/i, 'חוסם'],
      ];
      for (const [from, to] of pairs) {
        if (from.test(trimmed)) return trimmed.replace(from, to);
      }
      return line;
    });
  return lines.join('\n').trim();
}

export function rewriteDraftToHebrew(text, { party, ticket } = {}) {
  const src = String(text || '').trim();
  if (!src) return '';
  if (ticket && party) {
    const generated = summarizeTicket(ticket, { forceHebrew: true });
    const match = (generated.drafts || []).find((d) => d.party === party);
    if (match && match.text) return match.text;
  }
  return phraseRewriteToHebrew(src);
}

export function summarizeTicket(ticket, { forceHebrew = false } = {}) {
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

  const hebrew = Boolean(forceHebrew) || hasHebrew([ticket.subject, ...messages.map((m) => m.text)].join('\n'));
  const hotelInHebrew = Boolean(forceHebrew);
  const issue = inferIssue(ticket, messages, hebrew);
  const facts = extractFacts(ticket, messages);
  const waitingOn = inferWaitingOn(messages, issue.id, facts);
  const blocker = inferBlocker(waitingOn, issue, facts, hebrew);
  const parties = partiesForDrafts(issue.id, messages, waitingOn, facts);
  const note = buildTicketNote(ticket, messages, issue, facts, hebrew, blocker);

  return {
    summary: { note },
    drafts: parties.map((party, index) =>
      draftFor(party, index, ticket, issue, facts, messages, hebrew, hotelInHebrew, note)
    ),
  };
}
