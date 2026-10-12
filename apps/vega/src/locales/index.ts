import { ru } from './ru';
import { en } from './en';

const locales = { ru: { name: 'Русский', messages: ru }, en: { name: 'English', messages: en } };
type Locale = keyof typeof locales;
function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && Object.hasOwn(locales, value);
}
const messageMaps = new Map<string, Map<string, string>>(
  Object.entries(locales).map(([code, language]): [string, Map<string, string>] => [
    code,
    new Map(Object.entries(language.messages)),
  ]),
);
function translate(source: string, locale: Locale): string {
  return messageMaps.get(locale)?.get(source) ?? source;
}
export { locales, isLocale, translate, type Locale };
