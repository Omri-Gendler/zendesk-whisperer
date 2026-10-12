export var PORT_NAME = 'sidepanel';
export var PARTY_LABEL = {
  client: 'Client',
  hotel: 'Hotel',
  supplier: 'Supplier',
  internal: 'Internal',
};

export var els = {
  banner: document.getElementById('page-banner'),
  previewHint: document.getElementById('preview-hint'),
  previewBody: document.getElementById('preview-body'),
  generateBtn: document.getElementById('generate-btn'),
  langBar: document.getElementById('lang-bar'),
  summaryBody: document.getElementById('summary-body'),
  draftsBody: document.getElementById('drafts-body'),
  sourceBadge: document.getElementById('source-badge'),
};

export var state = {
  ticket: null,
  clearReason: null,
  summary: null,
  drafts: [],
  loading: false,
  loadingText: '',
  errorText: null,
  copiedId: null,
  source: null,
  hebrewTarget: null,
  hebrewSelected: { client: false, hotel: false, supplier: false, summary: false },
};
