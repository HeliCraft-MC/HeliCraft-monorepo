import { describe, expect, it } from 'vitest';
import { documentMarkdown, updateDocumentMarkdown } from '../src/states/constitution-markdown';
import type { StateConfiguration } from '@helicraft/alhena';

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
describe('localized constitution source', () => {
  it('keeps missing translations missing rather than copying an obsolete fallback on each edit', () => {
    const document: NonNullable<StateConfiguration['constitution']> = {
      title: { ru: 'Документ' },
      blocks: [{ id: ID, type: 'MARKDOWN', content: { ru: 'Old source' } }],
    };
    const result = updateDocumentMarkdown(document, 'ru', 'New source\n    indent\n');
    expect(result.blocks[0]).toMatchObject({ id: ID, content: { ru: 'New source\n    indent\n' } });
    expect(
      result.blocks[0]?.type === 'MARKDOWN' ? result.blocks[0].content.en : null,
    ).toBeUndefined();
    expect(documentMarkdown(result, 'en')).toBe('New source\n    indent\n');
  });
  it('retains the other explicit translation byte-for-byte', () => {
    const document: NonNullable<StateConfiguration['constitution']> = {
      title: {},
      blocks: [
        { id: ID, type: 'MARKDOWN', content: { ru: 'Русский', en: '  English  \n    nested\n' } },
      ],
    };
    const result = updateDocumentMarkdown(document, 'ru', 'Новый русский');
    expect(documentMarkdown(result, 'en')).toBe('  English  \n    nested\n');
  });
  it('converts legacy block order and stable references only when edited', () => {
    const document: NonNullable<StateConfiguration['constitution']> = {
      title: {},
      blocks: [
        { id: ID, type: 'GENERATED', kind: 'SINGLE_OFFICE', officeId: ID, action: null },
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          type: 'MARKDOWN',
          content: { ru: 'После', en: 'After' },
        },
      ],
    };
    expect(documentMarkdown(document, 'ru')).toBe(`{{block.SINGLE_OFFICE:${ID}}}\n\nПосле`);
    const result = updateDocumentMarkdown(
      document,
      'ru',
      `Before\n\n${documentMarkdown(document, 'ru')}`,
    );
    expect(result.blocks).toHaveLength(1);
    expect(documentMarkdown(result, 'en')).toBe(`{{block.SINGLE_OFFICE:${ID}}}\n\nAfter`);
    expect(document.blocks).toHaveLength(2);
  });
});
