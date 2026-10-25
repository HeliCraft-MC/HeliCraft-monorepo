import { locales } from './locales';

const formLanguages = Object.entries(locales).map(([code, item]) => ({ code, label: item.name }));
export { formLanguages };
