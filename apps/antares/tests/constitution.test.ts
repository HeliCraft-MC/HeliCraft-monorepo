import { describe, expect, it } from 'vitest';
import { emptyConfiguration } from '../src/modules/states/domain';
import { applyPreset } from '../src/modules/states/presets';
import { constitutionLimitIssues } from '../src/modules/states/constitution-limits';
import { renderConstitution } from '../src/modules/states/constitution-renderer';
import { expandConstitution, generatedProse } from '../src/modules/states/constitution-tokens';
import type { StateDetail, StateConfiguration } from '../src/modules/states/contracts';

const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const founders: StateDetail['founders'] = [{ id: USER, name: 'Founder', type: 'PRIMARY' }];
function configuration(): ReturnType<typeof emptyConfiguration> {
  return {
    ...emptyConfiguration(),
    name: { ru: 'Аврора', en: 'Aurora' },
    governance: applyPreset('AUTOCRACY', USER),
  };
}
function documentBody(
  content: StateConfiguration['name'],
): NonNullable<StateConfiguration['constitution']> {
  return {
    title: { en: 'Charter' },
    blocks: [{ id: crypto.randomUUID(), type: 'MARKDOWN', content }],
  };
}
describe('constitution documents', () => {
  it('writes complete founding and governance paragraphs with revision data and player heads', async () => {
    const state = configuration();
    state.constitution = documentBody({ ru: '{{block.FOUNDERS}}\n\n{{block.GOVERNANCE_SUMMARY}}' });
    const result = await renderConstitution(state, founders, 'ru');
    expect(result.html[0]?.html).toContain('Государство «Аврора» основано игроками');
    expect(result.html[0]?.html).toContain('Founder');
    expect(result.html[0]?.html).toContain(`/api/v1/public/players/${USER}/avatar.png`);
    expect(result.html[0]?.html).toContain('решение принимает должность');
    expect(result.html[0]?.html).not.toContain('{{');
    expect(result.warnings).toStrictEqual([]);
  });
  it('preserves line breaks, nested lists, code indentation and sanitized tables', async () => {
    const state = configuration();
    state.constitution = documentBody({
      en: 'First line\nSecond line\n\n- Parent\n    - Child\n\n    Code\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n<script>alert(1)</script>\n[unsafe](javascript:alert(1))',
    });
    const result = await renderConstitution(state, founders, 'en');
    const html = result.html[0]?.html ?? '';
    expect(html).toContain('First line<br>');
    expect(html).toContain('Second line');
    expect(html.match(/<ul>/gu)).toHaveLength(2);
    expect(html).toContain('<table>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href="javascript:');
  });
  it('resolves inline placeholders and escaped editor tokens while leaving code examples untouched', () => {
    const state = configuration();
    const context = { configuration: state, founders, locale: 'en' as const };
    const result = expandConstitution(
      'Welcome to {{state.name}}.\n\n{{block.CITIZENSHIP\\_RULES}}\n\n`{{state.name}}`\n```text\n{{founders}}\n```\n{{missing}}',
      context,
    );
    expect(result.markdown).toContain('Welcome to Aurora.');
    expect(result.markdown).toContain('Citizenship is granted by application');
    expect(result.markdown).toContain('`{{state.name}}`');
    expect(result.markdown).toContain('```text\n{{founders}}\n```');
    expect(result.unknown).toStrictEqual(['missing']);
  });
  it('bounds expanded document size before rendering repeated sections', () => {
    const context = { configuration: configuration(), founders, locale: 'en' as const };
    expect(() => expandConstitution('{{block.GOVERNANCE_SUMMARY}}', context, 20)).toThrow('объём');
    const oversized = configuration();
    oversized.description = { en: 'a'.repeat(100_000) };
    oversized.constitution = {
      title: { en: 'Charter' },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'MARKDOWN',
          content: { en: '{{state.description}}'.repeat(11) },
        },
      ],
    };
    expect(constitutionLimitIssues(oversized)).toHaveLength(1);
  });
  it('uses pinned office data and reports removed references rather than inventing a rule', () => {
    const state = configuration();
    const [office] = state.governance.offices;
    if (!office) {
      throw new Error('Fixture office missing');
    }
    office.name = { en: 'Pinned office' };
    const context = { configuration: state, founders, locale: 'en' as const };
    expect(expandConstitution(`{{office.${office.id}.name}}`, context).markdown).toBe(
      'Pinned office',
    );
    const original = generatedProse(
      {
        id: crypto.randomUUID(),
        type: 'GENERATED',
        kind: 'SINGLE_OFFICE',
        officeId: office.id,
        action: null,
      },
      context,
    );
    expect(original).toContain('Pinned office');
    state.governance.offices = [];
    expect(expandConstitution(`{{office.${office.id}.name}}`, context).unknown).toStrictEqual([
      `office.${office.id}.name`,
    ]);
  });
});
