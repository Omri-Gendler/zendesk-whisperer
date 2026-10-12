LABELS.internalNote = [/internal note/i, /private comment/i, /private note/i];
LABELS.publicReply = [/public reply/i, /public comment/i, /public response/i];
LABELS.traiderPrefix = /sync from traider\s*:?\s*/i;
LABELS.fieldNames = {
  checkIn: /check[-\s]?in/i,
  checkOut: /check[-\s]?out/i,
  reservationId: /reservation(\s*(id|number|#))?/i,
  hotel: /\bhotel\b/i,
  supplier: /\bsupplier\b/i,
  room: /room(\s*type)?/i,
  guest: /guest(\s*name)?/i,
};
