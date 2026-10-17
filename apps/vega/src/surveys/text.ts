import type { SurveyBlock } from '@helicraft/alhena';
import type { Locale } from '../locales';
import { uiText } from '../states/text';

const names: Record<SurveyBlock['type'], readonly [string, string]> = {
  SHORT_TEXT: ['Короткий текст', 'Short text'],
  PARAGRAPH: ['Длинный текст', 'Paragraph'],
  SINGLE_CHOICE: ['Один вариант', 'Single choice'],
  CHECKBOX: ['Несколько вариантов', 'Checkboxes'],
  DROPDOWN: ['Выпадающий список', 'Dropdown'],
  TEXT_BLOCK: ['Текстовый блок', 'Text block'],
  IMAGE_BLOCK: ['Изображения', 'Images'],
};
function blockName(type: SurveyBlock['type'], locale: Locale): string {
  const [ru, en] = names[type];
  return uiText(locale, ru, en);
}
export { blockName };
