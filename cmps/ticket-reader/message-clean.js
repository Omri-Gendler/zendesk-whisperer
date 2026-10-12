function cleanAuthorName(name) {
  var a = String(name || '').replace(/\s*[·•].*$/, '').replace(/\s+Internal$/i, '').trim();
  var parts = a.split(/\s+/);
  if (parts.length >= 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
    a = parts[0];
  }
  return a;
}

function isProbablyChrome(text) {
  return /^(send|public reply|internal note|add internal note|attach|cc|bcc)$/i.test(text);
}

function stripChromeFromMessage(text) {
  var t = String(text || '');
  t = t.replace(/\bShow more\b/gi, ' ');
  t = t.replace(/\bShow less\b/gi, ' ');
  t = t.replace(/^(Public reply|Internal note|Private comment|Email|WhatsApp|Web|Chat|הערה פנימית)\s*/gim, '');
  t = t.replace(/\bTo:\s*[A-Za-z0-9@._+\-\s]{0,60}/g, ' ');
  t = stripChromeExtra(t);
  return cleanText(t);
}
