import type { StateConfiguration, StateDetail, Issue } from './contracts';
import { SUPPORTED_LOCALES, resolveText } from '../localized-content/contracts';
import { generatedProse, expandConstitution, MAX_RENDER_LENGTH } from './constitution-tokens';
import { DomainError } from '../errors';

const MAX_USERNAME_LENGTH = 16;
const PRIMARY_PLACEHOLDER_ID = '00000000-0000-0000-0000-000000000000';
function constitutionLimitIssues(configuration: Readonly<StateConfiguration>): Issue[] {
  // A nickname containing only underscores is the worst case for Markdown escaping.
  // This transient bound is never displayed or persisted as player/world data.
  const founders: StateDetail['founders'] = [
    PRIMARY_PLACEHOLDER_ID,
    ...configuration.cofounderIds,
  ].map((id) => ({ id, name: '_'.repeat(MAX_USERNAME_LENGTH), type: 'PRIMARY' }));
  try {
    for (const locale of SUPPORTED_LOCALES) {
      const context = { configuration, founders, locale };
      let remaining = MAX_RENDER_LENGTH;
      for (const block of configuration.constitution?.blocks ?? []) {
        const source =
          block.type === 'MARKDOWN'
            ? resolveText(block.content, locale).value
            : generatedProse(block, context);
        const expanded = expandConstitution(source, context, remaining);
        remaining -= expanded.markdown.length;
      }
    }
  } catch (error) {
    if (error instanceof DomainError && error.code === 'CONSTITUTION_TOO_LONG') {
      return [
        {
          severity: 'ERROR',
          path: 'constitution',
          message:
            'Конституция после подстановок слишком велика. Сократите текст или повторяющиеся разделы.',
        },
      ];
    }
    throw error;
  }
  return [];
}
export { constitutionLimitIssues };
