import { REQUIRED_ACTIONS, validateGovernance, validateConstitution } from './validation';
import { StateConfigurationSchema } from './contracts';
import type { StateConfiguration, Issue, StateStatus } from './contracts';
import { resolveText } from '../localized-content/contracts';
import { DomainError, HTTP } from '../errors';

const PERCENT = 100;
function emptyConfiguration(): StateConfiguration {
  return {
    name: {},
    description: {},
    slug: '',
    color: '#3c44aa',
    verticalBanner: { baseColor: 'blue', layers: [] },
    horizontalFlag: { mode: 'BANNER', design: { baseColor: 'blue', layers: [] } },
    cofounderIds: [],
    citizenship: { entryMode: 'BY_APPLICATION', allowMultipleCitizenships: true },
    governance: {
      offices: [],
      policies: [],
      votingDefaults: {
        durationHours: 72,
        quorumPercent: 50,
        thresholdPercent: 66,
        thresholdKind: 'PERCENT',
        allowAbstain: true,
      },
      createdFromPreset: null,
    },
    constitution: null,
  };
}
function validateConfiguration(
  configuration: Readonly<StateConfiguration>,
  ownerId: string,
  eligibleHolderIds?: readonly string[],
): Issue[] {
  const parsed = StateConfigurationSchema.safeParse(configuration);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      severity: 'ERROR',
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }
  const founders = [ownerId, ...configuration.cofounderIds];
  const issues = validateGovernance(configuration.governance, eligibleHolderIds ?? founders);
  function error(path: string, message: string): void {
    issues.push({ severity: 'ERROR', path, message });
  }
  if (!resolveText(configuration.name, 'en').value) {
    error('name', 'Укажите хотя бы один перевод названия');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(configuration.slug)) {
    error('slug', 'Используйте латинские строчные буквы, цифры и дефисы');
  }
  if (!/^#[\da-f]{6}$/iu.test(configuration.color)) {
    error('color', 'Укажите цвет в формате #RRGGBB');
  }
  if (new Set(founders).size !== founders.length) {
    error('cofounderIds', 'Основатели не должны повторяться');
  }
  if (
    configuration.horizontalFlag.mode === 'PNG' &&
    configuration.horizontalFlag.mediaId === null
  ) {
    error('horizontalFlag', 'Загрузите PNG-флаг');
  }
  if ((configuration.name.en ?? '').trim() === '') {
    issues.push({
      severity: 'WARNING',
      path: 'name.en',
      message: 'Нет английского перевода; будет использован доступный перевод',
    });
  }
  issues.push(...validateConstitution(configuration));
  return issues;
}
function completion(configuration: Readonly<StateConfiguration>, ownerId: string): number {
  const checks = [
    Boolean(resolveText(configuration.name, 'en').value),
    Boolean(configuration.slug),
    Boolean(
      (configuration.description.ru ?? '').trim() + (configuration.description.en ?? '').trim(),
    ),
    configuration.governance.offices.every((office) => resolveText(office.name, 'en').value !== ''),
    configuration.governance.policies.length >= REQUIRED_ACTIONS.length,
    !validateConfiguration(configuration, ownerId).some((issue) => issue.severity === 'ERROR'),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * PERCENT);
}
function assertTransition(from: StateStatus, to: StateStatus, reason: string): void {
  const allowed: Record<StateStatus, readonly StateStatus[]> = {
    CREATED: ['ACTIVE', 'REJECTED'],
    ACTIVE: ['SUSPENDED'],
    SUSPENDED: ['ACTIVE'],
    REJECTED: [],
    DORMANT: [],
    DISSOLVED: [],
  };
  if (!allowed[from].includes(to)) {
    throw new DomainError(
      HTTP.conflict,
      'INVALID_STATE_TRANSITION',
      'Недопустимый переход статуса',
    );
  }
  if (!reason.trim()) {
    throw new DomainError(
      HTTP.badRequest,
      'REASON_REQUIRED',
      'Укажите причину административного решения',
    );
  }
}
export { validateGovernance, REQUIRED_ACTIONS } from './validation';
export { emptyConfiguration, validateConfiguration, completion, assertTransition };
