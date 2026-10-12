// The internal note format our team uses in Zendesk
export const NOTE_FIELDS = [
  { key: 'orderNumber', label: 'מספר הזמנה' },
  { key: 'supplierName', label: 'שם הספק' },
  { key: 'description', label: 'תיאור הפנייה' },
  { key: 'actionsTaken', label: 'פעולות שבוצעו' },
  { key: 'followUp', label: 'הערות והמשך טיפול' },
]

export function formatNote(note) {
  const lines = NOTE_FIELDS.map((field) => field.label + ': ' + (note[field.key] || ''))
  return lines.join('\n')
}

function guestReply(subject) {
  return 'Hi,\n\nThank you for writing about ' + subject + '.\nI am looking into it now and will update you soon.\n\nRegards'
}

// Simple fallback when no AI model answers
export function summarizeTicket(ticket) {
  const lastMessage = ticket.messages[ticket.messages.length - 1] || ''
  const note = {
    orderNumber: '',
    supplierName: '',
    description: ticket.subject,
    actionsTaken: lastMessage.slice(0, 180),
    followUp: 'Follow up with the guest after the next update.',
  }
  const drafts = [{ label: 'Reply to guest', text: guestReply(ticket.subject) }]
  return { source: 'rules', note: note, drafts: drafts }
}
