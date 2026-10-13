import type { StateConfiguration, LocalizedInput, ConstitutionBlock } from '@helicraft/alhena';
import type { MarkdownSnippet, MarkdownEditorLabels } from '@helicraft/atria';
import type { Locale } from '../locales';
import { displayText, uiText, label } from './text';

type Constitution = NonNullable<StateConfiguration['constitution']>;
function generatedToken(block: Extract<ConstitutionBlock, { type: 'GENERATED' }>): string {
  const reference = block.officeId ?? block.action;
  return `{{block.${block.kind}${reference === null ? '' : `:${reference}`}}}`;
}
function documentMarkdown(document: Constitution, locale: Locale): string {
  return document.blocks
    .map((block) =>
      block.type === 'MARKDOWN' ? displayText(block.content, locale) : generatedToken(block),
    )
    .join('\n\n');
}
function updateDocumentMarkdown(
  document: Constitution,
  locale: Locale,
  value: string,
): Constitution {
  const [first] = document.blocks;
  const content: LocalizedInput =
    first?.type === 'MARKDOWN' && document.blocks.length === 1 ? { ...first.content } : {};
  if (document.blocks.length !== 1 || first?.type !== 'MARKDOWN') {
    for (const code of ['ru', 'en'] as const) {
      if (
        document.blocks.some(
          (block) => block.type === 'MARKDOWN' && (block.content[code] ?? '').trim() !== '',
        )
      ) {
        content[code] = documentMarkdown(document, code);
      }
    }
  }
  content[locale] = value;
  const id = document.blocks.find((block) => block.type === 'MARKDOWN')?.id ?? crypto.randomUUID();
  return { ...document, blocks: [{ id, type: 'MARKDOWN', content }] };
}
function constitutionSnippets(
  configuration: StateConfiguration,
  locale: Locale,
): MarkdownSnippet[] {
  const staticItems = [
    ['state.name', 'Название государства', 'State name'],
    ['state.description', 'Описание государства', 'State description'],
    ['founders', 'Ники основателей', 'Founder nicknames'],
    ['state.slug', 'Адрес государства', 'State slug'],
    ['block.STATE_IDENTITY', 'Абзац: государство', 'Paragraph: state identity'],
    ['block.FOUNDERS', 'Абзац: основание государства', 'Paragraph: founding the state'],
    ['block.CITIZENSHIP_RULES', 'Абзац: гражданство', 'Paragraph: citizenship'],
    ['block.OFFICES_OVERVIEW', 'Раздел: должности', 'Section: offices'],
    ['block.VOTING_RULES', 'Абзац: голосования', 'Paragraph: voting'],
    ['block.GOVERNANCE_SUMMARY', 'Раздел: государственное устройство', 'Section: governance'],
  ];
  const result = staticItems.map(([id = '', ru = '', en = '']) => ({
    id,
    label: uiText(locale, ru, en),
    content: `{{${id}}}`,
  }));
  for (const office of configuration.governance.offices) {
    const name = displayText(office.name, locale);
    result.push(
      {
        id: `office.${office.id}.name`,
        label: `${uiText(locale, 'Название должности', 'Office name')}: ${name}`,
        content: `{{office.${office.id}.name}}`,
      },
      {
        id: `block.SINGLE_OFFICE:${office.id}`,
        label: `${uiText(locale, 'Абзац о должности', 'Office paragraph')}: ${name}`,
        content: `{{block.SINGLE_OFFICE:${office.id}}}`,
      },
    );
  }
  for (const policy of configuration.governance.policies) {
    result.push({
      id: `block.STATE_DECISION_RULE:${policy.action}`,
      label: `${uiText(locale, 'Процедура решения', 'Decision procedure')}: ${label(policy.action, locale)}`,
      content: `{{block.STATE_DECISION_RULE:${policy.action}}}`,
    });
  }
  return result;
}
function markdownLabels(locale: Locale): MarkdownEditorLabels {
  return {
    bold: uiText(locale, 'Жирный', 'Bold'),
    italic: uiText(locale, 'Курсив', 'Italic'),
    heading: uiText(locale, 'Заголовок', 'Heading'),
    bulletList: uiText(locale, 'Список', 'Bullet list'),
    orderedList: uiText(locale, 'Нумерация', 'Numbered list'),
    quote: uiText(locale, 'Цитата', 'Quote'),
    indent: uiText(locale, 'Увеличить отступ', 'Indent'),
    outdent: uiText(locale, 'Уменьшить отступ', 'Outdent'),
    undo: uiText(locale, 'Отменить', 'Undo'),
    redo: uiText(locale, 'Повторить', 'Redo'),
    visual: uiText(locale, 'Текстовый редактор', 'Text editor'),
    source: uiText(locale, 'Исходный Markdown', 'Markdown source'),
    snippet: uiText(locale, 'Подстановка или абзац', 'Placeholder or paragraph'),
    insert: uiText(locale, 'Вставить', 'Insert'),
  };
}
const CONSTITUTION_TEMPLATE =
  '# {{state.name}}\n\n{{block.FOUNDERS}}\n\n## Гражданство\n\n{{block.CITIZENSHIP_RULES}}\n\n{{block.GOVERNANCE_SUMMARY}}\n\n## Голосования\n\n{{block.VOTING_RULES}}\n\n## Права и обязанности\n\nОпишите здесь права граждан и принципы вашего сообщества.';
const CONSTITUTION_TEMPLATE_EN =
  '# {{state.name}}\n\n{{block.FOUNDERS}}\n\n## Citizenship\n\n{{block.CITIZENSHIP_RULES}}\n\n{{block.GOVERNANCE_SUMMARY}}\n\n## Voting\n\n{{block.VOTING_RULES}}\n\n## Rights and duties\n\nDescribe the rights of citizens and the principles of your community here.';
export {
  documentMarkdown,
  updateDocumentMarkdown,
  constitutionSnippets,
  markdownLabels,
  CONSTITUTION_TEMPLATE,
  CONSTITUTION_TEMPLATE_EN,
};
