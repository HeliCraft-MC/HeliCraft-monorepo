import { DomainError, HTTP } from '../errors';
import { GeneratedKindSchema, ActionSchema } from './contracts';
import type { ConstitutionBlockSchema } from './contracts';
import type { z } from '@hono/zod-openapi';
import { localized, phrase, escapeMarkdown } from './constitution-language';
import {
  playerNames,
  officeProse,
  policyProse,
  votingProse,
  citizenshipProse,
} from './constitution-prose';
import type { ConstitutionContext } from './constitution-prose';

type Generated = Extract<z.infer<typeof ConstitutionBlockSchema>, { type: 'GENERATED' }>;
// oxlint-disable-next-line max-lines-per-function -- The nine generated document sections are one exhaustive prose catalog.
function generatedProse(
  block: Readonly<Generated>,
  context: Readonly<ConstitutionContext>,
): string {
  const { configuration, locale } = context;
  const name = localized(configuration.name, locale) || phrase(locale, 'Государство', 'The state');
  switch (block.kind) {
    case 'STATE_IDENTITY': {
      return `${phrase(locale, `Государство «${name}» действует в соответствии с настоящей Конституцией и опубликованным государственным устройством.`, `The state “${name}” operates under this Constitution and its published governance.`)}\n\n${localized(configuration.description, locale)}`;
    }
    case 'FOUNDERS': {
      return phrase(
        locale,
        `Государство «${name}» основано игроками ${playerNames(context) || '—'}. Основатели образуют первоначальный состав граждан.`,
        `The state “${name}” was founded by players ${playerNames(context) || '—'}. Its founders form the initial citizen body.`,
      );
    }
    case 'CITIZENSHIP_RULES': {
      return citizenshipProse(context);
    }
    case 'VOTING_RULES': {
      return votingProse(configuration.governance.votingDefaults, locale);
    }
    case 'SINGLE_OFFICE':
    case 'OFFICE_APPOINTMENT_RULE': {
      const office = configuration.governance.offices.find((item) => item.id === block.officeId);
      return office === undefined
        ? phrase(
            locale,
            'Должность не выбрана или больше не существует.',
            'The office is not selected or no longer exists.',
          )
        : officeProse(office, context);
    }
    case 'STATE_DECISION_RULE': {
      const policy = configuration.governance.policies.find((item) => item.action === block.action);
      return policy === undefined
        ? phrase(
            locale,
            'Правило решения не выбрано или больше не существует.',
            'The decision rule is not selected or no longer exists.',
          )
        : policyProse(policy, context);
    }
    case 'OFFICES_OVERVIEW': {
      return configuration.governance.offices
        .map((office) => officeProse(office, context))
        .join('\n\n');
    }
    case 'GOVERNANCE_SUMMARY': {
      return [
        `## ${phrase(locale, 'Государственное устройство', 'Governance')}`,
        phrase(
          locale,
          `Полномочия в государстве «${name}» распределяются между следующими должностями. Решения принимаются по установленным ниже процедурам.`,
          `Authority in the state “${name}” is assigned to the following offices. Decisions follow the procedures below.`,
        ),
        configuration.governance.offices.map((office) => officeProse(office, context)).join('\n\n'),
        `## ${phrase(locale, 'Принятие решений', 'State decisions')}`,
        configuration.governance.policies
          .map((policy) => policyProse(policy, context))
          .join('\n\n'),
      ].join('\n\n');
    }
    default: {
      throw new Error('Unknown generated constitution block');
    }
  }
}
function generatedTokenValue(
  key: string,
  context: Readonly<ConstitutionContext>,
): string | undefined {
  const { configuration } = context;
  const generated = /^block\.(?<kind>[A-Z_]+)(?::(?<reference>[\w-]+))?$/u.exec(key);
  if (!generated) {
    return undefined;
  }
  const parsed = GeneratedKindSchema.safeParse(generated.groups?.kind);
  if (!parsed.success) {
    return undefined;
  }
  const needsOffice = ['SINGLE_OFFICE', 'OFFICE_APPOINTMENT_RULE'].includes(parsed.data);
  const officeId = needsOffice ? (generated.groups?.reference ?? null) : null;
  if (needsOffice && officeId === null) {
    return undefined;
  }
  const action =
    parsed.data === 'STATE_DECISION_RULE'
      ? ActionSchema.safeParse(generated.groups?.reference)
      : null;
  if (
    officeId !== null &&
    !configuration.governance.offices.some((office) => office.id === officeId)
  ) {
    return undefined;
  }
  if (
    action !== null &&
    (!action.success ||
      !configuration.governance.policies.some((policy) => policy.action === action.data))
  ) {
    return undefined;
  }
  return generatedProse(
    {
      id: crypto.randomUUID(),
      type: 'GENERATED',
      kind: parsed.data,
      officeId,
      action: action?.success === true ? action.data : null,
    },
    context,
  );
}
function tokenValue(key: string, context: Readonly<ConstitutionContext>): string | undefined {
  const { configuration, locale } = context;
  const values: Record<string, string> = {
    'state.name': localized(configuration.name, locale),
    'state.description': localized(configuration.description, locale),
    'state.slug': escapeMarkdown(configuration.slug),
    founders: playerNames(context),
    'citizenship.rules': citizenshipProse(context),
    'voting.rules': votingProse(configuration.governance.votingDefaults, locale),
  };
  if (Object.hasOwn(values, key)) {
    return values[key];
  }
  const officeField = /^office\.(?<office>[\da-f-]+)\.(?<field>name|description)$/u.exec(key);
  if (officeField) {
    const office = configuration.governance.offices.find(
      (item) => item.id === officeField.groups?.office,
    );
    return office === undefined
      ? undefined
      : localized(officeField.groups?.field === 'name' ? office.name : office.description, locale);
  }
  return generatedTokenValue(key, context);
}
const TOKENS = /(?<code>```[^]*?```|~~~[^]*?~~~|`[^`\n]*`)|\{\{(?<key>[^{}\n]+)\}\}/gu;
const MAX_RENDER_LENGTH = 1_000_000;
function expandConstitution(
  markdown: string,
  context: Readonly<ConstitutionContext>,
  limit = MAX_RENDER_LENGTH,
): { markdown: string; unknown: string[] } {
  const unknown = new Set<string>();
  const cache = new Map<string, string | undefined>();
  let { length } = markdown;
  if (length > limit) {
    throw new DomainError(
      HTTP.badRequest,
      'CONSTITUTION_TOO_LONG',
      'Документ превышает допустимый объём',
    );
  }
  const expanded = markdown.replaceAll(
    TOKENS,
    (match: string, code: string | undefined, key: string | undefined): string => {
      if (code !== undefined || key === undefined) {
        return match;
      }
      const normalized = key.trim().replaceAll(String.raw`\_`, '_');
      if (!cache.has(normalized)) {
        cache.set(normalized, tokenValue(normalized, context));
      }
      const value = cache.get(normalized);
      if (value === undefined) {
        unknown.add(key.trim());
        return match;
      }
      const replacement = normalized.startsWith('block.') ? `\n\n${value}\n\n` : value;
      length += replacement.length - match.length;
      if (length > limit) {
        throw new DomainError(
          HTTP.badRequest,
          'CONSTITUTION_TOO_LONG',
          'Документ превышает допустимый объём',
        );
      }
      return replacement;
    },
  );
  return { markdown: expanded, unknown: [...unknown] };
}
export { generatedProse, expandConstitution, MAX_RENDER_LENGTH };
