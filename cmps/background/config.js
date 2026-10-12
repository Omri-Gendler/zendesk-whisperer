export var ZENDESK_HOST = 'arbitrip-support.zendesk.com';
export var PORT_NAME = 'sidepanel';
export var PANEL_PATH = 'cmps/sidepanel/sidepanel.html';
export var RELOAD_TAB_REASON =
  'Reload this Zendesk tab so the copilot can attach (needed after you reload the extension).';

export var latest = {
  ticket: null,
  clearReason: null,
  liveUpdate: false,
};

export var sidepanelPorts = [];
export var ticketsByTab = {};
