function queryFirst(root, selectors) {
  if (!root) return null;
  for (var i = 0; i < selectors.length; i++) {
    try {
      var el = root.querySelector(selectors[i]);
      if (el) return el;
    } catch (e) {}
  }
  return null;
}

function queryAll(root, selectors) {
  var out = [];
  if (!root) return out;
  for (var i = 0; i < selectors.length; i++) {
    var list;
    try {
      list = root.querySelectorAll(selectors[i]);
    } catch (e) {
      continue;
    }
    for (var j = 0; j < list.length; j++) {
      var already = false;
      for (var k = 0; k < out.length; k++) {
        if (out[k] === list[j]) already = true;
      }
      if (!already) out.push(list[j]);
    }
  }
  return out;
}
