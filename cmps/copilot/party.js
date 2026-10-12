export function normalizeParty(party) {
  var p = String(party || '').toLowerCase();
  if (p === 'client' || p === 'customer' || p === 'guest') return 'client';
  if (p === 'hotel') return 'hotel';
  if (p === 'supplier' || p === 'expedia' || p === 'hotelbeds') return 'supplier';
  return 'internal';
}
