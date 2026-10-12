import { describe, expect, it } from 'vitest';
import { renderTranslations } from '../src/modules/content/translations';
import { ContentTranslationsSchema } from '../src/modules/translations';

describe('public translations', () => {
  it('sanitizes every translated Markdown body and removes raw Markdown from public DTOs', async () => {
    const translated = await renderTranslations({
      en: { title: 'English', markdown: '# Safe\n\n<script>alert(1)</script>' },
      ru: { markdown: '   ' },
    });
    expect(translated.en?.html).toMatch(/<h1[^>]*>Safe<\/h1>/u);
    expect(translated.en?.html).not.toContain('<script');
    expect(translated.en).not.toHaveProperty('markdown');
    expect(translated.ru?.html).toBe('');
  });
  it('accepts additional language codes without schema changes and rejects invalid fields', () => {
    expect(ContentTranslationsSchema.safeParse({ 'pt-BR': { title: 'Olá' } }).success).toBe(true);
    expect(
      ContentTranslationsSchema.safeParse({ 'not a language': { title: 'Bad' } }).success,
    ).toBe(false);
    expect(ContentTranslationsSchema.safeParse({ en: { privateData: 'Secret' } }).success).toBe(
      false,
    );
  });
});
