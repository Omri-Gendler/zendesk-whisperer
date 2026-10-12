export function rewriteGreeting(trimmed) {
  if (trimmed === 'Hello,' || trimmed === 'Hello') return 'שלום,';
  if (trimmed === 'Hi,' || trimmed === 'Hi') return 'היי,';
  if (trimmed === 'Thank you' || trimmed === 'Thank you.' || trimmed === 'Thanks.') return 'תודה';
  if (trimmed === 'Regards,' || trimmed === 'Best regards,') return 'בברכה,';
  return null;
}
