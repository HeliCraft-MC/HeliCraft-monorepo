import { renderMarkdown } from '../content/markdown';
import { SUPPORTED_LOCALES, resolveText } from '../localized-content/contracts';
import type { LocalizedInput } from '../localized-content/contracts';
import type { VotingInput } from './contracts';

async function surveyMarkdown(
  input: Readonly<VotingInput>,
): Promise<{ id: string; html: LocalizedInput }[]> {
  return await Promise.all(
    (input.survey?.blocks ?? [])
      .filter((block) => block.type === 'TEXT_BLOCK')
      .map(async (block) => {
        const html: LocalizedInput = {};
        for (const locale of SUPPORTED_LOCALES) {
          // oxlint-disable-next-line no-await-in-loop -- Each locale is rendered with the shared sanitized Markdown pipeline.
          html[locale] = await renderMarkdown(resolveText(block.content, locale).value);
        }
        return { id: block.id, html };
      }),
  );
}
export { surveyMarkdown };
