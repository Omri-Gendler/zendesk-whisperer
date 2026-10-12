function schedulePublish() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(publish, DEBOUNCE_MS);
}

function startObserver() {
  if (observer) observer.disconnect();
  var target = queryFirst(document, SELECTORS.ticketPane) || document.body;
  observer = new MutationObserver(schedulePublish);
  observer.observe(target, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}
