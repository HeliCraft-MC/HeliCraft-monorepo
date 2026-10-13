import type { StateConfiguration, StateDetail } from './contracts';
import type { Locale } from '../localized-content/contracts';
import { resolveText } from '../localized-content/contracts';
import { renderConstitutionMarkdown } from '../content/markdown';
import { generatedProse, expandConstitution, MAX_RENDER_LENGTH } from './constitution-tokens';

async function renderConstitution(
  configuration: Readonly<StateConfiguration>,
  founders: StateDetail['founders'],
  locale: Locale,
): Promise<{ html: StateDetail['constitutionHtml']; warnings: string[] }> {
  const context = { configuration, founders, locale };
  const blocks = configuration.constitution?.blocks ?? [];
  const warnings = new Set<string>();
  let remaining = MAX_RENDER_LENGTH;
  const html = await Promise.all(
    blocks.map(async (block) => {
      const source =
        block.type === 'GENERATED'
          ? generatedProse(block, context)
          : resolveText(block.content, locale).value;
      const expanded = expandConstitution(source, context, remaining);
      remaining -= expanded.markdown.length;
      for (const key of expanded.unknown) {
        warnings.add(key);
      }
      return { id: block.id, html: await renderConstitutionMarkdown(expanded.markdown) };
    }),
  );
  return { html, warnings: [...warnings] };
}
export { renderConstitution };
