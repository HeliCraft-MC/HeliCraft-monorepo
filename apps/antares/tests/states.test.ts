import { describe, expect, it } from 'vitest';
import { resolveText } from '../src/modules/localized-content/contracts';
import {
  emptyConfiguration,
  validateConfiguration,
  assertTransition,
} from '../src/modules/states/domain';
import { extractTexts, hydrateTexts } from '../src/modules/states/localized-snapshot';

const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
describe('localized display content', () => {
  it('resolves exact locale, English and deterministic remaining locales', () => {
    expect(resolveText({ ru: 'Республика', en: 'Republic' }, 'ru')).toStrictEqual({
      value: 'Республика',
      resolvedLocale: 'ru',
    });
    expect(resolveText({ ru: ' ', en: 'Republic' }, 'ru').resolvedLocale).toBe('en');
    expect(resolveText({ ru: 'Республика' }, 'en').resolvedLocale).toBe('ru');
    expect(resolveText({}, 'ru')).toStrictEqual({ value: '', resolvedLocale: null });
    expect(resolveText({ en: '', ru: 'Республика' }, 'en')).toStrictEqual(
      resolveText({ ru: 'Республика', en: '' }, 'en'),
    );
  });
  it('normalizes text separately from machine configuration and hydrates without changing input', () => {
    const configuration = emptyConfiguration();
    configuration.name = { ru: 'Аврора', en: 'Aurora' };
    const snapshot = extractTexts(configuration);
    expect(snapshot.machine.name).toStrictEqual({});
    expect(hydrateTexts(snapshot.machine, snapshot.texts)).toStrictEqual(configuration);
    expect(configuration.name.ru).toBe('Аврора');
  });
});
describe('state configuration and lifecycle', () => {
  it('allows incomplete draft structure but rejects submission without required procedures', () => {
    const errors = validateConfiguration(emptyConfiguration(), OWNER);
    expect(errors.some((issue) => issue.path === 'name' && issue.severity === 'ERROR')).toBe(true);
    expect(errors.some((issue) => issue.path === 'governance.policies.AMEND_GOVERNANCE')).toBe(
      true,
    );
  });
  it('rejects missing office references, duplicate founders and invalid generated blocks', () => {
    const configuration = emptyConfiguration();
    configuration.cofounderIds = [OWNER];
    configuration.governance.policies = [
      {
        action: 'AMEND_GOVERNANCE',
        mechanism: 'SINGLE_OFFICE',
        officeIds: [OWNER],
        vote: null,
        manualProcedure: {},
      },
    ];
    configuration.constitution = {
      title: { ru: 'Конституция' },
      blocks: [
        { id: OWNER, type: 'GENERATED', kind: 'SINGLE_OFFICE', officeId: OWNER, action: null },
      ],
    };
    const paths = validateConfiguration(configuration, OWNER).map((issue) => issue.path);
    expect(paths).toContain('cofounderIds');
    expect(paths).toContain('governance.policies.AMEND_GOVERNANCE');
    expect(paths).toContain(`constitution.blocks.${OWNER}`);
  });
  it('allows the reviewed lifecycle and requires a reason', () => {
    for (const [from, to] of [
      ['CREATED', 'ACTIVE'],
      ['ACTIVE', 'SUSPENDED'],
      ['SUSPENDED', 'ACTIVE'],
      ['CREATED', 'REJECTED'],
    ] as const) {
      expect(() => {
        assertTransition(from, to, 'Проверено');
      }).not.toThrow();
    }
    expect(() => {
      assertTransition('CREATED', 'SUSPENDED', 'Причина');
    }).toThrow('Недопустимый');
    expect(() => {
      assertTransition('REJECTED', 'ACTIVE', 'Причина');
    }).toThrow('Недопустимый');
    expect(() => {
      assertTransition('ACTIVE', 'SUSPENDED', '');
    }).toThrow('причину');
  });
});
