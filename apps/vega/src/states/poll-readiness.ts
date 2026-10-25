import type { LocalizedInput, VotingInput } from '@helicraft/alhena';
import type { Locale } from '../locales';
import { uiText } from './text';

function hasContent(value: LocalizedInput): boolean {
  return Object.values(value).some((text) => text !== undefined && text.trim() !== '');
}
function pollReadiness(input: VotingInput, locale: Locale): string[] {
  const issues: string[] = [];
  if (!hasContent(input.title)) {
    issues.push(uiText(locale, 'Добавьте название опроса.', 'Add a poll title.'));
  }
  const questions = input.survey?.blocks ?? input.questions ?? [];
  if (questions.length === 0) {
    issues.push(
      uiText(
        locale,
        'Добавьте хотя бы один вопрос или блок.',
        'Add at least one question or block.',
      ),
    );
  }
  for (const [index, question] of questions.entries()) {
    const decorative =
      'type' in question &&
      typeof question.type === 'string' &&
      ['TEXT_BLOCK', 'IMAGE_BLOCK'].includes(question.type);
    if (!decorative && !hasContent(question.title)) {
      issues.push(
        `${uiText(locale, 'Вопрос или блок', 'Question or block')} ${index + 1}: ${uiText(locale, 'добавьте текст.', 'add a title.')}`,
      );
    }
  }
  if (input.options.some((option) => !hasContent(option.label))) {
    issues.push(
      uiText(locale, 'Заполните текст всех вариантов ответа.', 'Fill in every answer option.'),
    );
  }
  const opens = Date.parse(input.opensAt);
  const closes = Date.parse(input.closesAt);
  if (
    !Number.isFinite(opens) ||
    (input.survey?.manualClose !== true && (!Number.isFinite(closes) || closes <= opens))
  ) {
    issues.push(
      uiText(
        locale,
        'В настройках укажите завершение позже начала опроса.',
        'In Settings, choose a closing time after the opening time.',
      ),
    );
  }
  return issues;
}
export { pollReadiness };
