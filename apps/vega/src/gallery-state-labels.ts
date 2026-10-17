import type { Locale } from './locales';

const labels = {
  LOCATION: { ru: 'Место съёмки', en: 'Photo location' },
  PARTICIPANT: { ru: 'Государство-участник', en: 'Participating state' },
  RELATED: { ru: 'Связано со снимком', en: 'Related to photo' },
};
function galleryStateRole(role: keyof typeof labels, locale: Locale): string {
  return labels[role][locale];
}
export { galleryStateRole };
