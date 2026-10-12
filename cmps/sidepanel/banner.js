import { state } from './state.js';

export function showBanner(kind, text) {
  var banner = document.getElementById('page-banner');
  if (!text) {
    banner.hidden = true;
    banner.textContent = '';
    banner.className = 'banner';
    return;
  }
  banner.hidden = false;
  banner.className = 'banner banner--' + kind;
  banner.textContent = text;
}

export function onStatus(text) {
  state.loadingText = text;
  var banner = document.getElementById('page-banner');
  banner.hidden = false;
  banner.className = 'banner banner--info';
  banner.textContent = text;
}
