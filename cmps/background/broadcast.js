import { latest, sidepanelPorts, ticketsByTab } from './config.js';

export function broadcast(message) {
  var stillOpen = [];
  for (var i = 0; i < sidepanelPorts.length; i++) {
    try {
      sidepanelPorts[i].postMessage(message);
      stillOpen.push(sidepanelPorts[i]);
    } catch (e) {}
  }
  sidepanelPorts.length = 0;
  for (var j = 0; j < stillOpen.length; j++) {
    sidepanelPorts.push(stillOpen[j]);
  }
}

export function rememberTab(tabId, entry) {
  if (tabId != null) ticketsByTab[tabId] = entry;
  latest.liveUpdate = true;
}
