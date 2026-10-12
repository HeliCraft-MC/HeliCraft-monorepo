import type { GalleryItem, PublicContent } from '@helicraft/alhena';

function fallbackText({
  original,
  originalLanguage,
  language,
  client,
  english,
}: Readonly<{
  original: string;
  originalLanguage: string;
  language: string;
  client: string | null | undefined;
  english: string | null | undefined;
}>): string {
  return (
    [
      language === originalLanguage ? original : client,
      originalLanguage === 'en' ? original : english,
      original,
    ].find((value): value is string => typeof value === 'string' && value.trim() !== '') ?? original
  );
}
function localizeContent(record: PublicContent, language: string): PublicContent {
  const originalLanguage = record.originalLanguage ?? 'ru';
  const client = record.translations?.[language];
  const english = record.translations?.en;
  function field(name: 'title' | 'description' | 'html' | 'seoTitle' | 'seoDescription'): string {
    return fallbackText({
      original: record[name] ?? '',
      originalLanguage,
      language,
      client: client?.[name],
      english: english?.[name],
    });
  }
  return {
    ...record,
    title: field('title'),
    description: field('description'),
    html: field('html'),
    seoTitle: field('seoTitle') || null,
    seoDescription: field('seoDescription') || null,
  };
}
function localizeGallery(record: GalleryItem, language: string): GalleryItem {
  const originalLanguage = record.originalLanguage ?? 'ru';
  const client = record.translations?.[language];
  const english = record.translations?.en;
  function field(name: 'title' | 'description' | 'alt' | 'place'): string {
    return fallbackText({
      original: record[name] ?? '',
      originalLanguage,
      language,
      client: client?.[name],
      english: english?.[name],
    });
  }
  return {
    ...record,
    title: field('title'),
    description: field('description'),
    alt: field('alt'),
    place: field('place'),
  };
}
export { localizeContent, localizeGallery, fallbackText };
