function stripChromeExtra(t) {
  t = t.replace(/\b(Yesterday|Today|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+\d{1,2}:\d{2}\b/gi, ' ');
  t = t.replace(/\bSep\s+\d{1,2},\s+\d{4},?\s+at\s+\d{1,2}:\d{2}\s*[AP]M\b/gi, ' ');
  t = t.replace(/Best Regards[\s\S]*/i, ' ');
  t = t.replace(/בברכה[\s\S]*/i, ' ');
  t = t.replace(/\|\s*EL AL Travel[\s\S]*/i, ' ');
  t = t.replace(/powered by Arbitrip[\s\S]*/i, ' ');
  t = t.replace(/<[^>\s]+@[^>]+>/g, ' ');
  return t;
}
