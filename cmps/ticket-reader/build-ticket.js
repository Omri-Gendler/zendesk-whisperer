function buildTicket() {
  var id = extractTicketId();
  if (!id) return null;
  var extracted = extractCustomFields();
  return {
    id: id,
    subject: extractSubject(id),
    url: location.href,
    extractedAt: new Date().toISOString(),
    messages: extractMessages(),
    customFields: extracted.customFields,
    customFieldsNormalized: extracted.customFieldsNormalized,
  };
}
