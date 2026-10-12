import { ZENDESK_HOST } from './config.js';

export function isZendeskUrl(urlString) {
  if (!urlString) return false;
  try {
    return new URL(urlString).hostname === ZENDESK_HOST;
  } catch (e) {
    return false;
  }
}
