function extractMessages() {
  var pane = ticketPane();
  var root = queryFirst(pane, SELECTORS.conversationRoot) || pane;
  var rawItems = queryAll(root, SELECTORS.messageItem);
  var items = [];
  var i;
  for (i = 0; i < rawItems.length; i++) {
    if (isVisible(rawItems[i]) && !isInsideComposer(rawItems[i])) items.push(rawItems[i]);
  }
  if (items.length === 0 && root !== pane) {
    for (i = 0; i < root.children.length; i++) {
      if (isVisible(root.children[i]) && !isInsideComposer(root.children[i])) {
        items.push(root.children[i]);
      }
    }
  }
  var messages = [];
  var seen = {};
  for (i = 0; i < items.length; i++) {
    var msg = parseMessage(items[i]);
    if (!msg) continue;
    var key = msg.author + '|' + msg.visibility + '|' + msg.text;
    if (seen[key]) continue;
    seen[key] = true;
    messages.push(msg);
    if (messages.length >= MAX_MESSAGES) break;
  }
  return messages;
}
