import { renderMarkdown } from './markdown';
import type { ContentTranslations } from '../translations';
import type { PublicContent } from './contracts';

async function renderTranslations(
  translations: ContentTranslations,
): Promise<PublicContent['translations']> {
  const entries = await Promise.all(
    Object.entries(translations).map(async ([language, translation]) => {
      const { markdown, ...fields } = translation;
      return [
        language,
        {
          ...fields,
          html:
            markdown === undefined || markdown.trim() === '' ? '' : await renderMarkdown(markdown),
        },
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}
export { renderTranslations };
