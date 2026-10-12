import { rewriteDraftToHebrew } from './rewrite-draft.js';

export function rulesSummaryNote(note) {
  return {
    ok: true,
    note: {
      orderNumber: note.orderNumber,
      supplierName: note.supplierName,
      description: rewriteDraftToHebrew(note.description, null, null),
      actionsTaken: rewriteDraftToHebrew(note.actionsTaken, null, null),
      followUp: rewriteDraftToHebrew(note.followUp, null, null),
    },
    source: 'rules',
  };
}
