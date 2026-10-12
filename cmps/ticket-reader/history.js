function hookHistory() {
  var oldPush = history.pushState.bind(history);
  var oldReplace = history.replaceState.bind(history);
  history.pushState = function () {
    var ret = oldPush.apply(history, arguments);
    schedulePublish();
    startObserver();
    return ret;
  };
  history.replaceState = function () {
    var ret = oldReplace.apply(history, arguments);
    schedulePublish();
    startObserver();
    return ret;
  };
  window.addEventListener('popstate', function () {
    schedulePublish();
    startObserver();
  });
}
