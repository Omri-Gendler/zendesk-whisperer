function isInsideComposer(el) {
  if (!el || !el.closest) return false;
  for (var i = 0; i < SELECTORS.composer.length; i++) {
    try {
      if (el.closest(SELECTORS.composer[i])) return true;
    } catch (e) {}
  }
  return false;
}
