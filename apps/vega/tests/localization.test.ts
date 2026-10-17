import { describe, expect, it } from 'vitest';
import { fallbackText, localizeGallery, localizeContent } from '../src/localized-content';
import { parsePrincipal } from '../src/principal-schema';
import { metadata } from '../src/metadata';
import type { GalleryItem, PublicContent } from '@helicraft/alhena';

const image: GalleryItem = {
  id: '11111111-1111-4111-8111-111111111111',
  originalLanguage: 'de',
  title: 'Hafen',
  description: 'Original description',
  alt: 'Original alt',
  place: '',
  translations: {
    ru: { title: 'Порт', description: ' ' },
    en: { title: 'Harbour', description: 'English description' },
  },
  location: null,
  players: [],
  states: [],
  author: { id: '22222222-2222-4222-8222-222222222222', name: 'Player' },
  width: 800,
  height: 600,
  createdAt: '2026-10-11T00:00:00.000Z',
  imageUrl: '/photo',
  thumbnailUrl: '/thumb',
};
const publication: PublicContent = {
  id: image.id,
  kind: 'PAGE',
  slug: 'example',
  title: 'Original',
  description: 'Original description',
  html: '<p>Original</p>',
  originalLanguage: 'de',
  translations: {
    en: { title: 'English', html: '<p>English</p>', seoTitle: 'Search title' },
    ru: { title: 'Русский', html: ' ' },
  },
  seoTitle: null,
  seoDescription: null,
  category: 'Мир',
  isFeatured: false,
  publishedAt: image.createdAt,
  updatedAt: image.createdAt,
  author: 'Editor',
  authorId: '11111111-1111-4111-8111-111111111111',
};
describe('published translations', () => {
  it('resolves each field through client, English, original, including whitespace and unsupported languages', () => {
    expect(localizeGallery(image, 'ru')).toMatchObject({
      title: 'Порт',
      description: 'English description',
      alt: 'Original alt',
    });
    expect(localizeGallery(image, 'fr').title).toBe('Harbour');
    expect(localizeGallery(image, 'de').title).toBe('Hafen');
    expect(localizeContent(publication, 'ru')).toMatchObject({
      title: 'Русский',
      html: '<p>English</p>',
      seoTitle: 'Search title',
    });
    expect(
      fallbackText({
        original: 'Original',
        originalLanguage: 'en',
        language: 'ru',
        client: '',
        english: 'Stale translation',
      }),
    ).toBe('Original');
  });
  it('emits language-specific canonical and alternate links', () => {
    const result = metadata({
      locale: 'en',
      title: 'Home',
      description: 'World',
      origin: 'https://helicraft.test',
      path: '/',
    });
    expect(result.links).toContainEqual({
      rel: 'canonical',
      href: 'https://helicraft.test/?lang=en',
    });
    expect(result.links).toContainEqual({
      rel: 'alternate',
      hrefLang: 'ru',
      href: 'https://helicraft.test/?lang=ru',
    });
    expect(result.scripts[0]?.children).toContain('"inLanguage":"en"');
  });
  it('rejects malformed account data before permissions reach the UI', () => {
    const principal = {
      id: image.id,
      username: 'Player',
      status: 'ACTIVE',
      createdAt: image.createdAt,
      currentSkinId: null,
      roles: ['PLAYER'],
      permissions: [],
    };
    expect(parsePrincipal(principal).permissions).toStrictEqual([]);
    expect(() => parsePrincipal({ ...principal, permissions: undefined })).toThrow();
    expect(() => parsePrincipal({ error: 'Route not found' })).toThrow();
  });
});
