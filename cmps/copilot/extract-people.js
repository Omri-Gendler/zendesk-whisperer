export function extractGuest(messages) {
  for (var i = 0; i < messages.length; i++) {
    if (messages[i].role === 'client' && messages[i].author) {
      var full = String(messages[i].author).replace(/\s+/g, ' ').trim();
      var lower = full.toLowerCase();
      if (lower.indexOf('support') !== -1 || lower.indexOf('arbitrip') !== -1) {
        return { first: '', full: '' };
      }
      return { first: full.split(' ')[0], full: full };
    }
  }
  return { first: '', full: '' };
}

export function extractAgentName(messages) {
  for (var i = messages.length - 1; i >= 0; i--) {
    var role = messages[i].role;
    if (role === 'agent' || role === 'internal') {
      if (!messages[i].author) continue;
      var name = String(messages[i].author).split(' ')[0];
      var lower = name.toLowerCase();
      if (lower === 'system' || lower === 'support' || lower === 'arbitrip') continue;
      return name;
    }
  }
  return '';
}
