import type { Locale } from '../locales';
import { uiText } from './text';

const reasons: Readonly<Record<string, readonly [string, string]>> = {
  'Approved according to current governance': [
    'Одобрено по действующей процедуре государства',
    'Approved according to current governance',
  ],
  'Institution procedures established': [
    'Первоначальные процедуры института утверждены',
    'Initial institution procedures approved',
  ],
};
function revisionReason(reason: string, locale: Locale): string {
  const translated = reasons[reason];
  return translated === undefined ? reason : uiText(locale, translated[0], translated[1]);
}
export { revisionReason };
