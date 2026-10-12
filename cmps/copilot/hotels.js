import { clip } from './clip.js';

var HOTEL_NAMES = [
  'Holiday Inn', 'Hilton', 'Marriott', 'Sheraton', 'Hyatt', 'Ibis', 'Novotel',
  'Crowne Plaza', 'Royal National', 'La Corte', 'Best Western', 'Radisson',
  'Mercure', 'Premier Inn', 'Altair',
];

export function findHotelName(text) {
  var lower = text.toLowerCase();
  for (var i = 0; i < HOTEL_NAMES.length; i++) {
    if (lower.indexOf(HOTEL_NAMES[i].toLowerCase()) !== -1) return HOTEL_NAMES[i];
  }
  var marker = text.indexOf('מלון ');
  if (marker !== -1) return clip(text.slice(marker, marker + 30), 30);
  return '';
}
