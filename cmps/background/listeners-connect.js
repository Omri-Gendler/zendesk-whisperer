import { PORT_NAME, sidepanelPorts } from './config.js';
import { snapshotMessage } from './cache.js';
import { findRelevantZendeskTab } from './tabs-find.js';
import { requestExtractFromTab } from './extract.js';

chrome.runtime.onConnect.addListener(function (port) {
  if (port.name !== PORT_NAME) return;
  sidepanelPorts.push(port);
  port.onDisconnect.addListener(function () {
    var next = [];
    for (var i = 0; i < sidepanelPorts.length; i++) {
      if (sidepanelPorts[i] !== port) next.push(sidepanelPorts[i]);
    }
    sidepanelPorts.length = 0;
    for (var j = 0; j < next.length; j++) sidepanelPorts.push(next[j]);
  });
  port.postMessage(snapshotMessage());
  findRelevantZendeskTab().then(function (tab) {
    if (tab) requestExtractFromTab(tab);
  });
});
