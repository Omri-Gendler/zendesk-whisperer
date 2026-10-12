import { clip } from './clip.js';
import { clientAsk } from './infer-wait.js';

export function buildDescription(issue, facts, messages, hebrew) {
  var ask = clientAsk(messages);
  var extra = '';
  if (facts.hotel) {
    extra += hebrew ? ' במלון ' + facts.hotel : ' at ' + facts.hotel;
  }
  if (facts.stay) {
    extra += hebrew ? ' לתאריכים ' + facts.stay : ' for ' + facts.stay;
  }
  if (ask) return clip(ask + extra, 280);
  return clip(issue.label + extra, 280);
}
